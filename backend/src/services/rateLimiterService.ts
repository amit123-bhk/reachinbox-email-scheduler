import { getRedisClient } from './redisService';
import { notifySlackRateLimit } from './slackService';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowStart: Date;
  windowKey: string;
}

export function getCurrentHourWindow(): { windowKey: string; nextWindowStart: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');

  const windowKey = `${year}-${month}-${day}-${hour}`;

  // Next window starts at top of next hour
  const nextWindowStart = new Date(now);
  nextWindowStart.setHours(now.getHours() + 1, 0, 0, 0);

  return { windowKey, nextWindowStart };
}

export async function checkAndIncrementRateLimit(
  senderId: string,
  senderEmail: string,
  senderName: string,
  hourlyLimit: number
): Promise<RateLimitCheckResult> {
  const redis = getRedisClient();
  const { windowKey, nextWindowStart } = getCurrentHourWindow();
  const redisKey = `rate_limit:${senderId}:${windowKey}`;

  // Atomic pipeline: GET current value
  const currentValStr = await redis.get(redisKey);
  const currentCount = currentValStr ? parseInt(currentValStr, 10) : 0;

  if (currentCount >= hourlyLimit) {
    // Already hit or exceeded hourly limit!
    // Trigger Slack notification asynchronously
    notifySlackRateLimit({
      senderEmail,
      senderName,
      hourlyLimit,
      currentCount,
      nextAvailableTime: nextWindowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }).catch((err) => console.error('[RateLimiter] Slack notification failed:', err));

    return {
      allowed: false,
      currentCount,
      limit: hourlyLimit,
      nextWindowStart,
      windowKey,
    };
  }

  // Increment counter atomically
  const newCount = await redis.incr(redisKey);
  if (newCount === 1) {
    // Set 2-hour TTL to ensure auto cleanup
    await redis.expire(redisKey, 7200);
  }

  if (newCount > hourlyLimit) {
    // Trigger Slack notification on exact limit breach
    notifySlackRateLimit({
      senderEmail,
      senderName,
      hourlyLimit,
      currentCount: newCount,
      nextAvailableTime: nextWindowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }).catch((err) => console.error('[RateLimiter] Slack notification failed:', err));

    return {
      allowed: false,
      currentCount: newCount,
      limit: hourlyLimit,
      nextWindowStart,
      windowKey,
    };
  }

  return {
    allowed: true,
    currentCount: newCount,
    limit: hourlyLimit,
    nextWindowStart,
    windowKey,
  };
}
