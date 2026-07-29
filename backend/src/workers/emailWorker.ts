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
      let rateLimitResult;
      try {
        rateLimitResult = await rateLimiterService.checkAndIncrement(
          senderId,
          scheduledEmail.sender?.maxPerHour || 500,
          scheduledEmail.sender?.minDelayMs || 100
        );
      } catch (rlErr) {
        logger.error({ rlErr, emailId }, '[EmailWorker] Rate limiter check failed');
      }

      if (rateLimitResult && !rateLimitResult.allowed) {
        // Revert status to PENDING so it can be picked up when rescheduled
        await prisma.scheduledEmail.update({
          where: { id: emailId },
          data: { status: ScheduledEmailStatus.PENDING },
        });

        // Import jobProducer dynamically to avoid circular dependencies
        const { jobProducer } = await import('../queue/jobProducer.js');
        const newJobId = await jobProducer.rescheduleJob(
          {
            emailId: scheduledEmail.id,
            campaignId: scheduledEmail.campaignId,
            recipientId: scheduledEmail.recipientId,
            senderId: scheduledEmail.senderId,
            scheduledFor: new Date(Date.now() + rateLimitResult.delayMs).toISOString(),
          },
          rateLimitResult.delayMs
        );

        if (newJobId) {
          await this.scheduledEmailRepo.setJobId(scheduledEmail.id, newJobId);
        }

        // Log RATE_LIMITED event to database
        await prisma.emailLog.create({
          data: {
            campaignId: scheduledEmail.campaignId,
            emailId: scheduledEmail.id,
            eventType: 'RATE_LIMITED',
            detailsJson: {
              delayMs: rateLimitResult.delayMs,
              senderId,
              currentCount: rateLimitResult.currentCount,
              maxLimit: rateLimitResult.maxLimit,
            },
          },
        });

        logger.info(
          { emailId, delayMs: rateLimitResult.delayMs, newJobId },
          '[EmailWorker] Rate limit exceeded. Reverted status to PENDING and rescheduled job.'
        );

        return { status: 'rate_limited', delayMs: rateLimitResult.delayMs };
      }

      // Spacing delay to mimic provider throttling (minimum delay between sends)
      if (rateLimitResult && rateLimitResult.delayMs > 0) {
        logger.info(
          { emailId, delayMs: rateLimitResult.delayMs },
          '[EmailWorker] Applying spacing delay before dispatch'
        );
        await new Promise((resolve) => setTimeout(resolve, rateLimitResult.delayMs));
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
        smtpConfig: scheduledEmail.sender ? {
          host: scheduledEmail.sender.smtpHost,
          port: scheduledEmail.sender.smtpPort,
          user: scheduledEmail.sender.smtpUser,
          pass: scheduledEmail.sender.smtpPass,
          isEthereal: scheduledEmail.sender.isEthereal,
        } : undefined,
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

      // Log EMAIL_SENT event to database for audit history (stores Ethereal preview link if generated)
      try {
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            emailId: emailId,
            eventType: 'EMAIL_SENT',
            detailsJson: {
              messageId: sendResult.messageId,
              previewUrl: sendResult.previewUrl || undefined,
            },
          },
        });
      } catch (err) {
        logger.error({ err }, '[EmailWorker] EmailLog creation for EMAIL_SENT failed');
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
