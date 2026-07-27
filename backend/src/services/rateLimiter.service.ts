import { redisClient } from '../config/redis';
import { logger } from '../logger/logger';

export interface RateLimitResult {
  allowed: boolean;
  delayMs: number;
  currentCount: number;
  maxLimit: number;
}

export class RateLimiterService {
  /**
   * Checks if an email dispatch is allowed within the current hour window for a specific sender.
   * Uses Redis atomic INCR and timestamp math.
   */
  async checkAndIncrement(
    senderId: string,
    maxPerHour: number,
    minDelayMs = 100
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const currentHourTimestamp = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
    const nextHourTimestamp = currentHourTimestamp + 60 * 60 * 1000;
    
    const windowKey = `ratelimit:sender:${senderId}:window:${currentHourTimestamp}`;
    const lastSentKey = `ratelimit:sender:${senderId}:last_sent`;

    // 1. Atomic increment of current hour count
    const currentCount = await redisClient.incr(windowKey);
    if (currentCount === 1) {
      // Set TTL to 2 hours for self-cleaning
      await redisClient.pexpire(windowKey, 2 * 60 * 60 * 1000);
    }

    // 2. Check if hourly limit exceeded
    if (currentCount > maxPerHour) {
      // Rollback increment so we don't inflate over-limit counters infinitely
      await redisClient.decr(windowKey);
      const delayUntilNextWindow = Math.max(nextHourTimestamp - now, 1000);

      logger.warn(
        { senderId, currentCount, maxPerHour, delayUntilNextWindow },
        '[RateLimiter] Hourly sender rate limit reached. Delaying job.'
      );

      return {
        allowed: false,
        delayMs: delayUntilNextWindow,
        currentCount,
        maxLimit: maxPerHour,
      };
    }

    // 3. Minimum spacing delay check between consecutive emails for same sender
    const lastSentStr = await redisClient.get(lastSentKey);
    let spacingDelay = 0;
    if (lastSentStr) {
      const lastSentTime = parseInt(lastSentStr, 10);
      const elapsed = now - lastSentTime;
      if (elapsed < minDelayMs) {
        spacingDelay = minDelayMs - elapsed;
      }
    }

    // Update last sent timestamp
    await redisClient.set(lastSentKey, (now + spacingDelay).toString(), 'PX', 60000);

    return {
      allowed: true,
      delayMs: spacingDelay,
      currentCount,
      maxLimit: maxPerHour,
    };
  }

  async getSenderUsage(senderId: string, maxPerHour: number): Promise<{ count: number; max: number; resetInMs: number }> {
    const now = Date.now();
    const currentHourTimestamp = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
    const nextHourTimestamp = currentHourTimestamp + 60 * 60 * 1000;
    const windowKey = `ratelimit:sender:${senderId}:window:${currentHourTimestamp}`;

    const countStr = await redisClient.get(windowKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    return {
      count,
      max: maxPerHour,
      resetInMs: Math.max(nextHourTimestamp - now, 0),
    };
  }
}

export const rateLimiterService = new RateLimiterService();
