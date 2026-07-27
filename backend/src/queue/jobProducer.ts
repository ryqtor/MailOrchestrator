import { queueManager, EmailJobPayload } from './queueManager';
import { logger } from '../logger/logger';
import { ScheduledEmailRepository } from '../repositories/scheduledEmail.repository';

export class JobProducer {
  private scheduledEmailRepo = new ScheduledEmailRepository();

  /**
   * Schedules a batch of email dispatch jobs into BullMQ.
   * If scheduledFor is in the future, calculates delay in milliseconds.
   */
  async scheduleEmailJobs(
    emails: Array<{
      id: string;
      campaignId: string;
      recipientId: string;
      senderId: string;
      scheduledFor: Date;
    }>
  ): Promise<void> {
    const now = Date.now();

    const jobs = emails.map((email) => {
      const scheduledTime = email.scheduledFor.getTime();
      const delay = Math.max(scheduledTime - now, 0);

      const payload: EmailJobPayload = {
        emailId: email.id,
        campaignId: email.campaignId,
        recipientId: email.recipientId,
        senderId: email.senderId,
        scheduledFor: email.scheduledFor.toISOString(),
      };

      return {
        name: `email-dispatch-${email.id}`,
        data: payload,
        opts: {
          jobId: `email-${email.id}`,
          delay,
        },
      };
    });

    // Bulk add jobs to BullMQ
    const addedJobs = await queueManager.emailQueue.addBulk(jobs);

    // Save generated BullMQ job IDs back to ScheduledEmail table
    for (let i = 0; i < addedJobs.length; i++) {
      const job = addedJobs[i];
      const email = emails[i];
      if (job.id) {
        await this.scheduledEmailRepo.setJobId(email.id, job.id);
      }
    }

    logger.info(
      { count: jobs.length, campaignId: emails[0]?.campaignId },
      '[JobProducer] Bulk email jobs successfully enqueued into BullMQ'
    );
  }

  /**
   * Re-schedules an existing job with a specified delay (used when rate limited).
   */
  async rescheduleJob(payload: EmailJobPayload, delayMs: number): Promise<string | undefined> {
    const job = await queueManager.emailQueue.add(
      `email-dispatch-${payload.emailId}`,
      payload,
      {
        jobId: `email-${payload.emailId}-delay-${Date.now()}`,
        delay: delayMs,
      }
    );

    logger.info(
      { emailId: payload.emailId, delayMs, newJobId: job.id },
      '[JobProducer] Rescheduled job due to rate limit'
    );

    return job.id;
  }
}

export const jobProducer = new JobProducer();
