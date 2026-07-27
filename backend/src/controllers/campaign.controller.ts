import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { CampaignRepository } from '../repositories/campaign.repository';
import { RecipientRepository } from '../repositories/recipient.repository';
import { BadRequestError, NotFoundError } from '../errors/customErrors';
import { CampaignStatus } from '@prisma/client';

export class CampaignController {
  private campaignRepo = new CampaignRepository();
  private recipientRepo = new RecipientRepository();

  public async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'default-system-user-id';
      const { title, subject, bodyTemplate, senderId, scheduledAt, minDelayMs, maxPerHour, recipients } = req.body;

      const campaign = await campaignService.createAndLaunchCampaign({
        userId,
        senderId,
        title,
        subject,
        bodyTemplate,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        minDelayMs: minDelayMs ? Number(minDelayMs) : undefined,
        maxPerHour: maxPerHour ? Number(maxPerHour) : undefined,
        recipients,
      });

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (err) {
      next(err);
    }
  }

  public async uploadCSVAndCreateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'default-system-user-id';
      const file = req.file;

      if (!file) {
        throw new BadRequestError('CSV file is required in request field "file"');
      }

      const { title, subject, bodyTemplate, senderId, scheduledAt, minDelayMs, maxPerHour } = req.body;
      if (!title || !subject || !bodyTemplate) {
        throw new BadRequestError('title, subject, and bodyTemplate are required text fields');
      }

      const recipients = campaignService.parseCSVBuffer(file.buffer);

      const campaign = await campaignService.createAndLaunchCampaign({
        userId,
        senderId,
        title,
        subject,
        bodyTemplate,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        minDelayMs: minDelayMs ? Number(minDelayMs) : undefined,
        maxPerHour: maxPerHour ? Number(maxPerHour) : undefined,
        recipients,
      });

      res.status(201).json({
        success: true,
        data: {
          campaign,
          parsedCount: recipients.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status ? (String(req.query.status) as CampaignStatus) : undefined;
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '20'), 10);

      const skip = (page - 1) * limit;

      const result = await this.campaignRepo.findMany({
        status,
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

  public async getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await this.campaignRepo.findById(id);

      if (!campaign) {
        throw new NotFoundError(`Campaign with ID ${id} not found`);
      }

      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '50'), 10);
      const skip = (page - 1) * limit;

      const recipientData = await this.recipientRepo.findByCampaignId(id, skip, limit);

      res.status(200).json({
        success: true,
        data: {
          ...campaign,
          recipients: recipientData.items,
          recipientsPagination: {
            page,
            limit,
            total: recipientData.total,
            pages: Math.ceil(recipientData.total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const campaignController = new CampaignController();
