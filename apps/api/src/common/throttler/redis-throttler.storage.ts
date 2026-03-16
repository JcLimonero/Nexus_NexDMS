import type { Redis } from 'ioredis';
import type { ThrottlerStorage } from '@nestjs/throttler';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

interface StoredThrottlerData {
  totalHits: number;
  expiresAt: number;
  blockExpiresAt: number;
  isBlocked: boolean;
}

const PREFIX = 'throttle:';

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `${PREFIX}${key}:${throttlerName}`;
    const now = Date.now();
    const ttlMs = ttl;
    const blockMs = blockDuration;

    const raw = await this.redis.get(redisKey);
    let data: StoredThrottlerData;

    if (raw) {
      try {
        data = JSON.parse(raw) as StoredThrottlerData;
      } catch {
        data = {
          totalHits: 0,
          expiresAt: now + ttlMs,
          blockExpiresAt: 0,
          isBlocked: false,
        };
      }
      if (now >= data.expiresAt) {
        data = {
          totalHits: 0,
          expiresAt: now + ttlMs,
          blockExpiresAt: 0,
          isBlocked: false,
        };
      }
    } else {
      data = {
        totalHits: 0,
        expiresAt: now + ttlMs,
        blockExpiresAt: 0,
        isBlocked: false,
      };
    }

    if (now >= data.blockExpiresAt && data.isBlocked) {
      data.isBlocked = false;
      data.totalHits = 0;
      data.expiresAt = now + ttlMs;
    }

    if (!data.isBlocked) {
      data.totalHits += 1;
    }

    if (data.totalHits > limit && !data.isBlocked) {
      data.isBlocked = true;
      data.blockExpiresAt = now + blockMs;
    }

    const expireSeconds = Math.ceil(
      (Math.max(data.expiresAt, data.blockExpiresAt) - now) / 1000,
    );
    await this.redis.setex(
      redisKey,
      Math.max(expireSeconds, 1),
      JSON.stringify(data),
    );

    return {
      totalHits: data.totalHits,
      timeToExpire: Math.ceil((data.expiresAt - now) / 1000),
      isBlocked: data.isBlocked,
      timeToBlockExpire: Math.max(
        0,
        Math.ceil((data.blockExpiresAt - now) / 1000),
      ),
    };
  }
}
