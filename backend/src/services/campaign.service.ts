import { parse } from 'csv-parse/sync';
import { CampaignRepository } from '../repositories/campaign.repository';
import { RecipientRepository } from '../repositories/recipient.repository';
import { ScheduledEmailRepository } from '../repositories/scheduledEmail.repository';
import { SenderRepository } from '../repositories/sender.repository';
import { jobProducer } from '../queue/jobProducer';
import { BadRequestError, NotFoundError } from '../errors/customErrors';
import { EmailCampaign, CampaignStatus, LogEventType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../logger/logger';

export interface CSVRecipientRow {
  email: string;
  name?: string;
  company?: string;
  [key: string]: unknown;
}

export interface InvalidCSVRow {
  line: number;
  row: Record<string, string>;
  reason: string;
}

export class CampaignService {
  private campaignRepo = new CampaignRepository();
  private recipientRepo = new RecipientRepository();
  private scheduledEmailRepo = new ScheduledEmailRepository();
  private senderRepo = new SenderRepository();

  public parseCSVBuffer(buffer: Buffer): { validRows: CSVRecipientRow[]; invalidRows: InvalidCSVRow[] } {
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validRows: CSVRecipientRow[] = [];
      const invalidRows: InvalidCSVRow[] = [];

      let lineNum = 2; // Line 1 is headers

      for (const row of records) {
        const emailKey = Object.keys(row).find((k) => k.toLowerCase() === 'email');
        
        if (!emailKey) {
          invalidRows.push({
            line: lineNum++,
            row,
            reason: 'Missing email column header',
          });
          continue;
        }

        const rawEmail = row[emailKey]?.trim();
        if (!rawEmail || !emailRegex.test(rawEmail)) {
          invalidRows.push({
            line: lineNum++,
            row,
            reason: !rawEmail ? 'Empty email field' : `Invalid email syntax: "${rawEmail}"`,
          });
          continue;
        }

        const metadata: Record<string, unknown> = { ...row };
        delete metadata[emailKey];

        validRows.push({
          email: rawEmail,
          name: row.name || row.Name || row.first_name,
          company: row.company || row.Company,
          ...metadata,
        });
        lineNum++;
      }

      if (validRows.length === 0 && invalidRows.length === 0) {
        throw new BadRequestError('CSV file is empty');
      }

      return { validRows, invalidRows };
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      throw new BadRequestError(`Failed to parse CSV file: ${err instanceof Error ? err.message : 'Invalid format'}`);
    }
  }

  public async createAndLaunchCampaign(params: {
    userId: string;
    senderId?: string;
    title: string;
    subject: string;
    bodyTemplate: string;
    scheduledAt?: Date;
    minDelayMs?: number;
    maxPerHour?: number;
    recipients: CSVRecipientRow[];
  }): Promise<EmailCampaign> {
    let senderId = params.senderId;
    if (!senderId) {
      const defaultSender = await this.senderRepo.ensureDefaultSender(params.userId);
      senderId = defaultSender.id;
    } else {
      const sender = await this.senderRepo.findById(senderId);
      if (!sender) throw new NotFoundError('Specified EmailSender not found');
    }

    if (params.minDelayMs !== undefined || params.maxPerHour !== undefined) {
      await prisma.emailSender.update({
        where: { id: senderId },
        data: {
          ...(params.minDelayMs !== undefined ? { minDelayMs: params.minDelayMs } : {}),
          ...(params.maxPerHour !== undefined ? { maxPerHour: params.maxPerHour } : {}),
        },
      });
    }

    const isValidDate = (d?: Date) => d && !isNaN(d.getTime());
    const validScheduledAt = isValidDate(params.scheduledAt) ? params.scheduledAt : undefined;

    // 1. Create Campaign
    const campaign = await this.campaignRepo.create({
      userId: params.userId,
      senderId,
      title: params.title,
      subject: params.subject,
      bodyTemplate: params.bodyTemplate,
      scheduledAt: validScheduledAt,
      totalRecipients: params.recipients.length,
    });

    // 2. Bulk insert recipients
    const recipientRecords = params.recipients.map((r) => ({
      campaignId: campaign.id,
      email: r.email,
      metadataJson: r as Record<string, unknown>,
    }));

    await this.recipientRepo.bulkCreate(recipientRecords);

    // Fetch inserted recipient IDs
    const { items: insertedRecipients } = await this.recipientRepo.findByCampaignId(campaign.id, 0, params.recipients.length);

    // 3. Create ScheduledEmail records
    const scheduledTime = validScheduledAt || new Date();
    const scheduledEmailInputs = insertedRecipients.map((rec) => ({
      campaignId: campaign.id,
      recipientId: rec.id,
      senderId: senderId!,
      scheduledFor: scheduledTime,
    }));

    const scheduledEmails = await this.scheduledEmailRepo.bulkCreate(scheduledEmailInputs);

    // 4. Update Campaign status to PROCESSING or SCHEDULED
    const targetStatus = validScheduledAt && validScheduledAt.getTime() > Date.now()
      ? CampaignStatus.SCHEDULED
      : CampaignStatus.PROCESSING;

    await this.campaignRepo.updateStatus(campaign.id, targetStatus);

    // 5. Enqueue jobs into BullMQ
    const jobsToEnqueue = scheduledEmails.map((se) => ({
      id: se.id,
      campaignId: campaign.id,
      recipientId: se.recipientId,
      senderId: senderId!,
      scheduledFor: se.scheduledFor,
    }));

    await jobProducer.scheduleEmailJobs(jobsToEnqueue);

    // Log Campaign Launch
    await prisma.emailLog.create({
      data: {
        campaignId: campaign.id,
        eventType: LogEventType.CAMPAIGN_CREATED,
        detailsJson: {
          title: campaign.title,
          totalRecipients: params.recipients.length,
          scheduledAt: scheduledTime.toISOString(),
          minDelayMs: params.minDelayMs || 100,
          maxPerHour: params.maxPerHour || 500,
        },
      },
    });

    logger.info(
      { campaignId: campaign.id, recipientCount: params.recipients.length },
      '[CampaignService] Campaign created and jobs enqueued successfully'
    );

    return (await this.campaignRepo.findById(campaign.id))!;
  }
}

export const campaignService = new CampaignService();
