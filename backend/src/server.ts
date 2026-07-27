import { createApp } from './app';
import { env } from './config/env';
import { logger } from './logger/logger';
import { UserRepository } from './repositories/user.repository';
import { EmailWorker } from './workers/emailWorker';
import { WorkerHealth } from './workers/workerHealth';

async function startServer() {
  const app = createApp();

  // Ensure default system user exists safely
  try {
    const userRepo = new UserRepository();
    await userRepo.ensureDefaultUser();
  } catch (err) {
    logger.warn({ err }, '[Server] System user initialization deferred until DB connection is established');
  }

  // Optionally initialize in-process worker if running in single-node dev mode
  let inlineWorker: EmailWorker | null = null;
  let inlineHealth: WorkerHealth | null = null;

  if (env.NODE_ENV === 'development') {
    logger.info('[Server] Starting inline worker process for local development...');
    inlineWorker = new EmailWorker();
    inlineHealth = new WorkerHealth();
    await inlineHealth.startHeartbeat();
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`[Server] MailOrchestrator API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, '[Server] Graceful shutdown initiated...');

    server.close(async () => {
      logger.info('[Server] HTTP server closed.');
      if (inlineHealth) await inlineHealth.stop();
      if (inlineWorker) await inlineWorker.close();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  logger.error({ err }, '[Server] Failed to start MailOrchestrator backend');
  process.exit(1);
});
