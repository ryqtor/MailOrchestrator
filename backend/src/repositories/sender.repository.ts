import { prisma } from '../db/prisma';
import { EmailSender } from '@prisma/client';

export class SenderRepository {
  async findById(id: string): Promise<EmailSender | null> {
    return prisma.emailSender.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<EmailSender[]> {
    return prisma.emailSender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async ensureDefaultSender(userId: string): Promise<EmailSender> {
    const existing = await prisma.emailSender.findFirst({ where: { userId } });
    if (existing) return existing;

    return prisma.emailSender.create({
      data: {
        userId,
        name: 'Default Ethereal Sender',
        fromEmail: 'orchestrator@ethereal.email',
        isEthereal: true,
        maxPerHour: 500,
        minDelayMs: 100,
      },
    });
  }

  async create(data: {
    userId: string;
    name: string;
    fromEmail: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    isEthereal?: boolean;
    maxPerHour?: number;
    minDelayMs?: number;
  }): Promise<EmailSender> {
    return prisma.emailSender.create({ data });
  }
}
