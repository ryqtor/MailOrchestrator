import { prisma } from '../db/prisma';
import { EmailSender } from '@prisma/client';
import { env } from '../config/env';

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

    const gmailUser = env.GMAIL_USER || env.SMTP_USER;
    const gmailPass = env.GMAIL_APP_PASSWORD || env.SMTP_PASS;
    const smtpHost = env.SMTP_HOST || (env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
    const hasRealSmtp = !!(smtpHost && gmailUser && gmailPass);

    return prisma.emailSender.create({
      data: {
        userId,
        name: hasRealSmtp ? 'Configured Real Mail Sender' : 'Default Ethereal Sender',
        fromEmail: env.SMTP_FROM || gmailUser || 'orchestrator@ethereal.email',
        smtpHost: smtpHost || null,
        smtpPort: env.SMTP_PORT || (smtpHost?.includes('gmail.com') ? 465 : 587),
        smtpUser: gmailUser || null,
        smtpPass: gmailPass || null,
        isEthereal: !hasRealSmtp,
        maxPerHour: env.DEFAULT_MAX_EMAILS_PER_HOUR,
        minDelayMs: env.DEFAULT_MIN_DELAY_MS,
      },
    });
  }

  async create(data: {
    userId: string;
    name: string;
    fromEmail: string;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    isEthereal?: boolean;
    maxPerHour?: number;
    minDelayMs?: number;
  }): Promise<EmailSender> {
    return prisma.emailSender.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      fromEmail?: string;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpUser?: string | null;
      smtpPass?: string | null;
      isEthereal?: boolean;
      maxPerHour?: number;
      minDelayMs?: number;
    }
  ): Promise<EmailSender> {
    return prisma.emailSender.update({
      where: { id },
      data,
    });
  }
}
