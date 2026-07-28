import { prisma } from '../db/prisma';
import { ScheduledEmail, ScheduledEmailStatus, Prisma } from '@prisma/client';

export type ScheduledEmailWithRelations = Prisma.ScheduledEmailGetPayload<{
  include: {
    recipient: true;
    campaign: true;
    sender: true;
  };
}>;

export class ScheduledEmailRepository {
  async bulkCreate(
    emails: Array<{
      campaignId: string;
      recipientId: string;
      senderId: string;
      scheduledFor: Date;
    }>
  ): Promise<ScheduledEmail[]> {
    const createdList: ScheduledEmail[] = [];
    for (const item of emails) {
      const created = await prisma.scheduledEmail.create({
        data: item,
      });
      createdList.push(created);
    }
    return createdList;
  }

  async setJobId(id: string, jobId: string): Promise<void> {
    await prisma.scheduledEmail.update({
      where: { id },
      data: { jobId },
    });
  }

  async findById(id: string): Promise<ScheduledEmailWithRelations | null> {
    return prisma.scheduledEmail.findUnique({
      where: { id },
      include: {
        recipient: true,
        campaign: true,
        sender: true,
      },
    });
  }

  async claimForSending(id: string): Promise<boolean> {
    const result = await prisma.scheduledEmail.updateMany({
      where: {
        id,
        status: ScheduledEmailStatus.PENDING,
      },
      data: {
        status: ScheduledEmailStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });
    return result.count > 0;
  }

  async markSent(id: string): Promise<void> {
    await prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: ScheduledEmailStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string, canRetry: boolean): Promise<void> {
    await prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: canRetry ? ScheduledEmailStatus.PENDING : ScheduledEmailStatus.FAILED,
        lastError: errorMessage,
      },
    });
  }

  async findMany(params: {
    campaignId?: string;
    status?: ScheduledEmailStatus;
    skip?: number;
    take?: number;
  }) {
    const where = {
      ...(params.campaignId ? { campaignId: params.campaignId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 25,
        orderBy: { scheduledFor: 'asc' },
        include: {
          recipient: true,
          campaign: { select: { id: true, title: true, subject: true } },
          logs: { select: { eventType: true, detailsJson: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.scheduledEmail.count({ where }),
    ]);

    return { items, total };
  }
}
