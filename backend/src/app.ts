import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import emailRoutes from './routes/email.routes';
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

  // Rate limiting for public REST API
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.' } },
  });

  app.use(apiLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Mount API Routes
  app.use('/', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/campaigns', campaignRoutes);
  app.use('/emails', emailRoutes);

  // 404 Handler
  app.use('*', (_req, _res, next) => {
    next(new NotFoundError('API Route not found'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
