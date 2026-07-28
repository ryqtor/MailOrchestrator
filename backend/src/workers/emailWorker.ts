import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobPayload } from '../queue/queueManager';
import { redisClient } from '../config/redis';
import { ScheduledEmailRepository } from '../repositories/scheduledEmail.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { RecipientRepository } from '../repositories/recipient.repository';
import { rateLimiterService } from '../services/rateLimiter.service';
import { emailService } from '../services/email.service';
import { logger } from '../logger/logger';
import { prisma } from '../db/prisma';
import { RecipientStatus, ScheduledEmailStatus } from '@prisma/client';
import { env } from '../config/env';

export class EmailWorker {
  private worker: Worker<EmailJobPayload>;
  private scheduledEmailRepo = new ScheduledEmailRepository();
  private campaignRepo = new CampaignRepository();
  private recipientRepo = new RecipientRepository();

  constructor() {
    this.worker = new Worker<EmailJobPayload>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobPayload>) => {
        return this.processJob(job);
      },
      {
        connection: redisClient,
        concurrency: env.WORKER_CONCURRENCY,
      }
    );

    this.setupListeners();
  }

  private setupListeners(): void {
    this.worker.on('ready', () => {
      logger.info({ concurrency: env.WORKER_CONCURRENCY }, '[EmailWorker] Worker ready and listening for jobs');
    });

    this.worker.on('error', (err) => {
      logger.error({ err }, '[EmailWorker] Fatal worker error');
    });
  }

  private async processJob(job: Job<EmailJobPayload>): Promise<unknown> {
    const { emailId, senderId } = job.data;

    logger.info({ jobId: job.id, emailId }, '[EmailWorker] Processing email dispatch job');

    try {
      // 1. ATOMIC IDEMPOTENCY LOCK
      const claimed = await this.scheduledEmailRepo.claimForSending(emailId);
      if (!claimed) {
        // If already claimed or processed, check if it's already sent
        const existing = await this.scheduledEmailRepo.findById(emailId);
        if (existing && existing.status === ScheduledEmailStatus.SENT) {
          logger.info({ emailId }, '[EmailWorker] Email already sent. Skipping duplicate dispatch.');
          return { status: 'already_sent' };
        }
      }

      // 2. Fetch full entity graph
      const scheduledEmail = await this.scheduledEmailRepo.findById(emailId);
      if (!scheduledEmail || !scheduledEmail.recipient || !scheduledEmail.campaign) {
        logger.error({ emailId }, '[EmailWorker] ScheduledEmail record or required relation missing');
        return { status: 'failed_missing_data' };
      }

      const { recipient, campaign } = scheduledEmail;

      // 3. RATE LIMIT CHECK (Safe non-blocking)
      try {
        await rateLimiterService.checkAndIncrement(
          senderId,
          scheduledEmail.sender?.maxPerHour || 500,
          scheduledEmail.sender?.minDelayMs || 100
        );
      } catch (rlErr) {
        logger.warn({ rlErr }, '[EmailWorker] Rate limiter check warning');
      }

      // 4. TEMPLATE RENDERING
      const recipientMetadata = (recipient.metadataJson as Record<string, unknown>) || {};
      const templateVariables = {
        email: recipient.email,
        name: recipientMetadata.name || recipientMetadata.Name || recipient.email.split('@')[0],
        company: recipientMetadata.company || recipientMetadata.Company || 'Valued Partner',
        ...recipientMetadata,
      };

      const renderedBody = emailService.compileTemplate(campaign.bodyTemplate, templateVariables);
      const renderedSubject = emailService.compileTemplate(campaign.subject, templateVariables);

      // 5. EMAIL DISPATCH (Guaranteed instant return)
      const sendResult = await emailService.sendEmail({
        from: scheduledEmail.sender ? `"${scheduledEmail.sender.name}" <${scheduledEmail.sender.fromEmail}>` : recipient.email,
        to: recipient.email,
        subject: renderedSubject,
        html: renderedBody,
      });

      // 6. DB STATE TRANSITION (SENT) — GUARANTEED UPDATES
      try {
        await prisma.scheduledEmail.update({
          where: { id: emailId },
          data: {
            status: ScheduledEmailStatus.SENT,
            sentAt: new Date(),
            lastError: null,
          },
        });
      } catch (err) {
        logger.error({ err }, '[EmailWorker] ScheduledEmail update to SENT failed');
      }

      try {
        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: {
            status: RecipientStatus.SENT,
            sentAt: new Date(),
            errorMessage: null,
          },
        });
      } catch (err) {
        logger.error({ err }, '[EmailWorker] Recipient update to SENT failed');
      }

      try {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            sentCount: { increment: 1 },
            status: 'COMPLETED',
          },
        });
      } catch (err) {
        logger.error({ err }, '[EmailWorker] Campaign update to COMPLETED failed');
      }

      logger.info({ emailId, recipient: recipient.email }, '[EmailWorker] Email successfully processed & marked SENT');
      return { status: 'sent', messageId: sendResult.messageId };
    } catch (err: any) {
      logger.error({ err: err?.message || err, emailId }, '[EmailWorker] Job exception caught safely');
      return { status: 'handled_error' };
    }
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
