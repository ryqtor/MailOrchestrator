import { prisma } from '../db/prisma';
import { EmailRecipient, RecipientStatus, Prisma } from '@prisma/client';

export class RecipientRepository {
  async bulkCreate(
    recipients: Array<{ campaignId: string; email: string; metadataJson?: Record<string, unknown> }>
  ): Promise<number> {
    const data = recipients.map((r) => ({
      campaignId: r.campaignId,
      email: r.email,
      metadataJson: r.metadataJson ? (r.metadataJson as Prisma.InputJsonObject) : Prisma.DbNull,
    }));

    const result = await prisma.emailRecipient.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findByCampaignId(
    campaignId: string,
    skip = 0,
    take = 50
  ): Promise<{ items: EmailRecipient[]; total: number }> {
    const where = { campaignId };
    const [items, total] = await Promise.all([
      prisma.emailRecipient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.emailRecipient.count({ where }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, status: RecipientStatus, errorMessage?: string): Promise<EmailRecipient> {
    return prisma.emailRecipient.update({
      where: { id },
      data: {
        status,
        ...(status === RecipientStatus.SENT ? { sentAt: new Date() } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      },
    });
  }
}
