import { z } from 'zod';

export const createCampaignSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    subject: z.string().min(1, 'Subject is required'),
    bodyTemplate: z.string().min(1, 'Body template is required'),
    senderId: z.string().uuid().optional(),
    scheduledAt: z.string().optional(),
    minDelayMs: z.coerce.number().min(0).optional().default(100),
    maxPerHour: z.coerce.number().min(1).optional().default(500),
    recipients: z
      .array(
        z.object({
          email: z.string().email('Invalid recipient email address'),
          name: z.string().optional(),
          company: z.string().optional(),
        }).passthrough()
      )
      .min(1, 'At least 1 recipient is required'),
  }),
});

export const getCampaignsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PAUSED']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
});
