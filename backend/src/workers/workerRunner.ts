import { EmailWorker } from './emailWorker';
import { WorkerHealth } from './workerHealth';
import { logger } from '../logger/logger';

async function bootstrapWorker() {
  logger.info('[WorkerRunner] Bootstrapping standalone worker process...');

  const worker = new EmailWorker();
  const health = new WorkerHealth();

  await health.startHeartbeat();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, '[WorkerRunner] Received shutdown signal. Gracefully closing worker...');
    await health.stop();
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrapWorker().catch((err) => {
  logger.error({ err }, '[WorkerRunner] Failed to start worker');
  process.exit(1);
});
