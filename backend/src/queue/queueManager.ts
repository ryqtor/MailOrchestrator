import { Queue, QueueEvents } from 'bullmq';
import { redisClient } from '../config/redis';
import { logger } from '../logger/logger';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export interface EmailJobPayload {
  emailId: string;
  campaignId: string;
  recipientId: string;
  senderId: string;
  scheduledFor: string;
}

export class QueueManager {
  private static instance: QueueManager;
  public emailQueue: Queue<EmailJobPayload>;
  public queueEvents: QueueEvents;

  private constructor() {
    this.emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 86400, count: 5000 },
        removeOnFail: { age: 604800, count: 10000 },
      },
    });

    this.queueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
      connection: redisClient,
    });

    this.setupListeners();
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private setupListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.debug({ jobId }, '[QueueEvents] Job completed successfully');
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error({ jobId, failedReason }, '[QueueEvents] Job execution failed');
    });
  }

  async getMetrics(): Promise<{
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  }> {
    const [waiting, active, delayed, failed, completed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getDelayedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getCompletedCount(),
    ]);

    return { waiting, active, delayed, failed, completed };
  }
}

export const queueManager = QueueManager.getInstance();
