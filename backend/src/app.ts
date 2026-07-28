import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import emailRoutes from './routes/email.routes';
import senderRoutes from './routes/sender.routes';
import healthRoutes from './routes/health.routes';

import { errorHandler } from './middleware/errorHandler.middleware';
import { NotFoundError } from './errors/customErrors';

export const createApp = (): Express => {
  const app = express();

  // Security Middleware & CORS Setup
  app.use(helmet({ contentSecurityPolicy: false }));

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://mail-orchestrator.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or matching origins
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          // Fallback to allow Vercel previews & production cross-origin requests
          callback(null, true);
        }
      },
      credentials: true,
    })
  );

  app.set('trust proxy', 1);

  // Rate limiting for public REST API (generous limit to support live dashboard 3s polling)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // allow up to 10,000 requests per 15 minutes to support auto-polling UI
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.' } },
  });

  app.use(apiLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Root health check endpoint
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'MailOrchestrator API Service Running',
      version: '1.0.0',
    });
  });

  // Mount API Routes under both root and /api prefixes for maximum compatibility
  app.use('/', healthRoutes);
  app.use('/api', healthRoutes);

  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/campaigns', campaignRoutes);
  app.use('/api/campaigns', campaignRoutes);

  app.use('/emails', emailRoutes);
  app.use('/api/emails', emailRoutes);

  app.use('/senders', senderRoutes);
  app.use('/api/senders', senderRoutes);

  // Debug endpoint: verify which code version Railway is actually running
  app.get('/api/debug', (_req, res) => {
    res.json({
      version: 'v4-instant-dispatch',
      buildTimestamp: '2026-07-29T04:30:00Z',
      workerType: 'bulletproof-no-throw',
      emailServiceType: 'instant-0ms',
    });
  });

  // Queue drain: clear failed jobs and reset stuck emails
  app.post('/api/queue/drain', async (_req, res) => {
    try {
      const { PrismaClient, ScheduledEmailStatus } = require('@prisma/client');
      const { QueueManager } = require('./queue/queueManager');
      const prismaClient = new PrismaClient();
      const qm = QueueManager.getInstance();

      // 1. Drain BullMQ failed queue
      await qm.emailQueue.drain();
      const failedJobs = await qm.emailQueue.getFailed(0, 1000);
      for (const job of failedJobs) {
        await job.remove();
      }

      // 2. Reset all FAILED and PROCESSING emails back to PENDING
      const resetResult = await prismaClient.scheduledEmail.updateMany({
        where: {
          status: { in: [ScheduledEmailStatus.FAILED, ScheduledEmailStatus.PROCESSING] },
        },
        data: {
          status: ScheduledEmailStatus.PENDING,
          lastError: null,
          attempts: 0,
        },
      });

      // 3. Reset recipient statuses
      await prismaClient.emailRecipient.updateMany({
        where: { status: { in: ['FAILED', 'PENDING'] } },
        data: { status: 'PENDING', errorMessage: null },
      });

      res.json({
        success: true,
        message: `Queue drained. ${resetResult.count} emails reset to PENDING for reprocessing.`,
        resetCount: resetResult.count,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 404 Handler
  app.use('*', (_req, _res, next) => {
    next(new NotFoundError('API Route not found'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
