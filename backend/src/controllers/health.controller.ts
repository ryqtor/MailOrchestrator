import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { redisClient } from '../config/redis';
import { metricsService } from '../services/metrics.service';

export class HealthController {
  public async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let dbHealthy = false;
      let redisHealthy = false;

      try {
        await prisma.$queryRaw`SELECT 1`;
        dbHealthy = true;
      } catch {
        dbHealthy = false;
      }

      try {
        const ping = await redisClient.ping();
        redisHealthy = ping === 'PONG';
      } catch {
        redisHealthy = false;
      }

      const isHealthy = dbHealthy && redisHealthy;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
          redis: redisHealthy ? 'HEALTHY' : 'UNHEALTHY',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await metricsService.getSystemMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const healthController = new HealthController();
