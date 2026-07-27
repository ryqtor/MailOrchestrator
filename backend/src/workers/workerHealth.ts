import os from 'os';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { logger } from '../logger/logger';

export class WorkerHealth {
  private workerId: string;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.workerId = `worker-${os.hostname()}-${process.pid}`;
  }

  public async startHeartbeat(): Promise<void> {
    const registerWorker = async () => {
      try {
        await prisma.workerState.upsert({
          where: { workerId: this.workerId },
          update: {
            status: 'RUNNING',
            currentConcurrency: env.WORKER_CONCURRENCY,
            lastHeartbeat: new Date(),
          },
          create: {
            workerId: this.workerId,
            hostname: os.hostname(),
            status: 'RUNNING',
            currentConcurrency: env.WORKER_CONCURRENCY,
            startedAt: new Date(),
          },
        });
      } catch (err) {
        logger.error({ err }, '[WorkerHealth] Failed to register heartbeat');
      }
    };

    await registerWorker();
    this.intervalId = setInterval(registerWorker, 15000);
  }

  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    try {
      await prisma.workerState.update({
        where: { workerId: this.workerId },
        data: { status: 'STOPPED', lastHeartbeat: new Date() },
      });
    } catch {
      // Ignore on shutdown
    }
  }
}
