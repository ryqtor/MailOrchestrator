import { Request, Response, NextFunction } from 'express';
import { ScheduledEmailRepository } from '../repositories/scheduledEmail.repository';
import { ScheduledEmailStatus } from '@prisma/client';

export class EmailController {
  private scheduledEmailRepo = new ScheduledEmailRepository();

  public async getScheduledEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const campaignId = req.query.campaignId as string | undefined;

      const skip = (page - 1) * limit;

      const result = await this.scheduledEmailRepo.findMany({
        campaignId,
        status: ScheduledEmailStatus.PENDING,
        skip,
        take: limit,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getSentEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const campaignId = req.query.campaignId as string | undefined;

      const skip = (page - 1) * limit;

      const result = await this.scheduledEmailRepo.findMany({
        campaignId,
        status: ScheduledEmailStatus.SENT,
        skip,
        take: limit,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const emailController = new EmailController();
