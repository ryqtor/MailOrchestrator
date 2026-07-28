import { Request, Response, NextFunction } from 'express';
import { SenderRepository } from '../repositories/sender.repository';
import { emailService } from '../services/email.service';
import { BadRequestError, NotFoundError } from '../errors/customErrors';

export class SenderController {
  private senderRepo = new SenderRepository();

  public async getSenders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'default-system-user-id';
      let senders = await this.senderRepo.findByUserId(userId);
      
      if (senders.length === 0) {
        const defaultSender = await this.senderRepo.ensureDefaultSender(userId);
        senders = [defaultSender];
      }

      res.status(200).json({
        success: true,
        data: senders,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getDefaultSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'default-system-user-id';
      const sender = await this.senderRepo.ensureDefaultSender(userId);

      res.status(200).json({
        success: true,
        data: sender,
      });
    } catch (err) {
      next(err);
    }
  }

  public async createSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'default-system-user-id';
      const { name, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass, isEthereal, maxPerHour, minDelayMs } = req.body;

      if (!name || !fromEmail) {
        throw new BadRequestError('name and fromEmail are required');
      }

      const sender = await this.senderRepo.create({
        userId,
        name,
        fromEmail,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser || null,
        smtpPass: smtpPass || null,
        isEthereal: isEthereal !== undefined ? Boolean(isEthereal) : true,
        maxPerHour: maxPerHour ? Number(maxPerHour) : 500,
        minDelayMs: minDelayMs ? Number(minDelayMs) : 100,
      });

      res.status(201).json({
        success: true,
        data: sender,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const existing = await this.senderRepo.findById(id);

      if (!existing) {
        throw new NotFoundError(`Sender with ID ${id} not found`);
      }

      const { name, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass, isEthereal, maxPerHour, minDelayMs } = req.body;

      const updated = await this.senderRepo.update(id, {
        ...(name !== undefined && { name }),
        ...(fromEmail !== undefined && { fromEmail }),
        ...(smtpHost !== undefined && { smtpHost: smtpHost || null }),
        ...(smtpPort !== undefined && { smtpPort: smtpPort ? Number(smtpPort) : null }),
        ...(smtpUser !== undefined && { smtpUser: smtpUser || null }),
        ...(smtpPass !== undefined && { smtpPass: smtpPass || null }),
        ...(isEthereal !== undefined && { isEthereal: Boolean(isEthereal) }),
        ...(maxPerHour !== undefined && { maxPerHour: Number(maxPerHour) }),
        ...(minDelayMs !== undefined && { minDelayMs: Number(minDelayMs) }),
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async testSenderConnection(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass, isEthereal, testRecipient, authType, clientId, clientSecret, refreshToken } = req.body;

      const result = await emailService.testSmtpConnection(
        {
          host: smtpHost,
          port: smtpPort ? Number(smtpPort) : 587,
          user: smtpUser,
          pass: smtpPass,
          isEthereal: Boolean(isEthereal),
          authType,
          clientId,
          clientSecret,
          refreshToken,
        },
        testRecipient
      );

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: { messageId: result.messageId },
      });
    } catch (err: any) {
      res.status(200).json({
        success: false,
        message: `SMTP Connection test failed: ${err?.message || 'Invalid configuration or network timeout'}`,
      });
    }
  }
}

export const senderController = new SenderController();
