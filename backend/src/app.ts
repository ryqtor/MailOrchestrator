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

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  // 404 Handler
  app.use('*', (_req, _res, next) => {
    next(new NotFoundError('API Route not found'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
