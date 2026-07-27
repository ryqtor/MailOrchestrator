import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobPayload } from '../queue/queueManager';
import { redisClient } from '../config/redis';
import { ScheduledEmailRepository } from '../repositories/scheduledEmail.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { RecipientRepository } from '../repositories/recipient.repository';
import { rateLimiterService } from '../services/rateLimiter.service';
import { emailService } from '../services/email.service';
import { jobProducer } from '../queue/jobProducer';
import { logger } from '../logger/logger';
import { prisma } from '../db/prisma';
import { LogEventType, RecipientStatus, ScheduledEmailStatus } from '@prisma/client';
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

    // 1. ATOMIC IDEMPOTENCY LOCK
    const claimed = await this.scheduledEmailRepo.claimForSending(emailId);
    if (!claimed) {
      logger.warn({ emailId }, '[EmailWorker] Email already claimed or processed. Skipping duplicate dispatch.');
      return { status: 'skipped_duplicate' };
    }

    // 2. Fetch full entity graphs
    const scheduledEmail = await this.scheduledEmailRepo.findById(emailId);
    if (!scheduledEmail || !scheduledEmail.recipient || !scheduledEmail.campaign || !scheduledEmail.sender) {
      logger.error({ emailId }, '[EmailWorker] ScheduledEmail record or required relation missing');
      await this.scheduledEmailRepo.markFailed(emailId, 'Missing entity data', false);
      return { status: 'failed_missing_data' };
    }

    const { recipient, campaign, sender } = scheduledEmail;

    // 3. RATE LIMIT CHECK
    const rateLimitCheck = await rateLimiterService.checkAndIncrement(
      senderId,
      sender.maxPerHour,
      sender.minDelayMs
    );

    if (!rateLimitCheck.allowed) {
      // Revert status to PENDING so it can be claimed again when delay expires
      await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: { status: ScheduledEmailStatus.PENDING },
      });

      // Reschedule job in BullMQ for exact next window
      await jobProducer.rescheduleJob(job.data, rateLimitCheck.delayMs);

      await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          emailId,
          eventType: LogEventType.RATE_LIMITED,
          detailsJson: {
            delayMs: rateLimitCheck.delayMs,
            senderId,
            currentCount: rateLimitCheck.currentCount,
          },
        },
      });

      logger.warn(
        { emailId, delayMs: rateLimitCheck.delayMs },
        '[EmailWorker] Rate limit active. Re-enqueued job with delay.'
      );

      return { status: 'rate_limited', delayMs: rateLimitCheck.delayMs };
    }

    // Apply minor spacing delay if required by rate limiter
    if (rateLimitCheck.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, rateLimitCheck.delayMs));
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

    // 5. SMTP DISPATCH
    try {
      const sendResult = await emailService.sendEmail({
        from: `"${sender.name}" <${sender.fromEmail}>`,
        to: recipient.email,
        subject: renderedSubject,
        html: renderedBody,
        smtpConfig: {
          host: sender.smtpHost,
          port: sender.smtpPort,
          user: sender.smtpUser,
          pass: sender.smtpPass,
          isEthereal: sender.isEthereal,
        },
      });

      // 6. DB STATE TRANSITION (SENT)
      await this.scheduledEmailRepo.markSent(emailId);
      await this.recipientRepo.updateStatus(recipient.id, RecipientStatus.SENT);
      await this.campaignRepo.incrementSentCount(campaign.id);

      await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          emailId,
          eventType: LogEventType.EMAIL_SENT,
          detailsJson: {
            messageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl || null,
            recipient: recipient.email,
          },
        },
      });

      logger.info({ emailId, recipient: recipient.email }, '[EmailWorker] Email successfully sent!');

      return { status: 'sent', messageId: sendResult.messageId, previewUrl: sendResult.previewUrl };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown SMTP failure';
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 3);

      logger.error(
        { err: errorMessage, emailId, attemptsMade: job.attemptsMade },
        '[EmailWorker] Email dispatch failed'
      );

      await this.scheduledEmailRepo.markFailed(emailId, errorMessage, !isFinalAttempt);

      if (isFinalAttempt) {
        await this.recipientRepo.updateStatus(recipient.id, RecipientStatus.FAILED, errorMessage);
        await this.campaignRepo.incrementFailedCount(campaign.id);
      }

      await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          emailId,
          eventType: isFinalAttempt ? LogEventType.FAILURE : LogEventType.RETRY,
          detailsJson: {
            error: errorMessage,
            attemptsMade: job.attemptsMade + 1,
            isFinalAttempt,
          },
        },
      });

      throw err;
    }
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
