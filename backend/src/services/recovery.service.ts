import { prisma } from '../db/prisma';
import { ScheduledEmailStatus } from '@prisma/client';
import { queueManager, EmailJobPayload } from '../queue/queueManager';
import { logger } from '../logger/logger';

export class RecoveryService {
  /**
   * Recovers scheduled email jobs after a server or container restart.
   * Ensures zero lost emails and zero duplicates.
   */
  async recoverPendingJobs(): Promise<{ recoveredCount: number; resetCount: number }> {
    logger.info('[RecoveryService] Running server startup boot recovery check...');

    let resetCount = 0;
    let recoveredCount = 0;

    try {
      // 1. Reset any stale PROCESSING emails back to PENDING (if server crashed during worker handling)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const staleProcessing = await prisma.scheduledEmail.updateMany({
        where: {
          status: ScheduledEmailStatus.PROCESSING,
          updatedAt: { lt: oneMinuteAgo },
        },
        data: {
          status: ScheduledEmailStatus.PENDING,
        },
      });
      resetCount = staleProcessing.count;

      if (resetCount > 0) {
        logger.info({ resetCount }, '[RecoveryService] Reset stale PROCESSING jobs back to PENDING');
      }

      // 2. Find all PENDING scheduled emails
      const pendingEmails = await prisma.scheduledEmail.findMany({
        where: {
          status: ScheduledEmailStatus.PENDING,
        },
        include: {
          recipient: true,
          campaign: true,
          sender: true,
        },
      });

      const now = Date.now();

      for (const email of pendingEmails) {
        const jobId = email.jobId || `email-${email.id}`;

        // Check if job exists in BullMQ
        const existingJob = await queueManager.emailQueue.getJob(jobId);

        if (!existingJob) {
          const scheduledTime = email.scheduledFor.getTime();
          const delay = Math.max(scheduledTime - now, 0);

          const payload: EmailJobPayload = {
            emailId: email.id,
            campaignId: email.campaignId,
            recipientId: email.recipientId,
            senderId: email.senderId,
            scheduledFor: email.scheduledFor.toISOString(),
          };

          await queueManager.emailQueue.add(`email-dispatch-${email.id}`, payload, {
            jobId,
            delay,
          });

          if (!email.jobId) {
            await prisma.scheduledEmail.update({
              where: { id: email.id },
              data: { jobId },
            });
          }

          recoveredCount++;
        }
      }

      logger.info(
        { pendingTotal: pendingEmails.length, recoveredCount, resetCount },
        '[RecoveryService] Server restart recovery check completed successfully'
      );
    } catch (err) {
      logger.error({ err }, '[RecoveryService] Error during startup recovery check');
    }

    return { recoveredCount, resetCount };
  }
}

export const recoveryService = new RecoveryService();
