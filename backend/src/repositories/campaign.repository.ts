import { prisma } from '../db/prisma';
import { EmailCampaign, CampaignStatus } from '@prisma/client';

export class CampaignRepository {
  async create(data: {
    userId: string;
    senderId: string;
    title: string;
    subject: string;
    bodyTemplate: string;
    scheduledAt?: Date;
    totalRecipients?: number;
  }): Promise<EmailCampaign> {
    return prisma.emailCampaign.create({
      data: {
        ...data,
        status: data.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      },
    });
  }

  async findById(id: string): Promise<EmailCampaign | null> {
    return prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        sender: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findMany(params: {
    userId?: string;
    status?: CampaignStatus;
    skip?: number;
    take?: number;
  }): Promise<{ items: EmailCampaign[]; total: number }> {
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: { sender: true },
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    return { items, total };
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<EmailCampaign> {
    return prisma.emailCampaign.update({
      where: { id },
      data: { status },
    });
  }

  async incrementSentCount(id: string): Promise<void> {
    await prisma.emailCampaign.update({
      where: { id },
      data: { sentCount: { increment: 1 } },
    });
  }

  async incrementFailedCount(id: string): Promise<void> {
    await prisma.emailCampaign.update({
      where: { id },
      data: { failedCount: { increment: 1 } },
    });
  }

  async updateProgressCounts(id: string, sentCount: number, failedCount: number, total: number): Promise<void> {
    const isCompleted = sentCount + failedCount >= total;
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        sentCount,
        failedCount,
        ...(isCompleted ? { status: CampaignStatus.COMPLETED } : {}),
      },
    });
  }
}
