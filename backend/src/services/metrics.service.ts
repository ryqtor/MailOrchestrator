import { queueManager } from '../queue/queueManager';
import { prisma } from '../db/prisma';
import { CampaignStatus, ScheduledEmailStatus } from '@prisma/client';

export class MetricsService {
  async getSystemMetrics() {
    const queueMetrics = await queueManager.getMetrics();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      sentTodayCount,
      failedTodayCount,
      totalCampaigns,
      processingCampaigns,
      totalRecipients,
      activeWorkers,
    ] = await Promise.all([
      prisma.scheduledEmail.count({
        where: {
          status: ScheduledEmailStatus.SENT,
          sentAt: { gte: startOfToday },
        },
      }),
      prisma.scheduledEmail.count({
        where: {
          status: ScheduledEmailStatus.FAILED,
          updatedAt: { gte: startOfToday },
        },
      }),
      prisma.emailCampaign.count(),
      prisma.emailCampaign.count({
        where: { status: CampaignStatus.PROCESSING },
      }),
      prisma.emailRecipient.count(),
      prisma.workerState.count({
        where: {
          status: 'RUNNING',
          lastHeartbeat: { gte: new Date(Date.now() - 60000) },
        },
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      queue: queueMetrics,
      telemetry: {
        sentToday: sentTodayCount,
        failedToday: failedTodayCount,
        totalCampaigns,
        processingCampaigns,
        totalRecipients,
        activeWorkers,
      },
    };
  }
}

export const metricsService = new MetricsService();
