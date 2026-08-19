import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
@SkipThrottle({ short: true, medium: true, long: true })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'Liveness OK' })
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'Readiness OK (DB + Redis)' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redisCheck(),
    ]);
  }

  private async redisCheck(): Promise<{
    redis: { status: 'up' | 'down'; message?: string };
  }> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      return { redis: { status: 'up', message: 'Redis URL not configured' } };
    }
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    try {
      await redis.ping();
      redis.disconnect();
      return { redis: { status: 'up' } };
    } catch (err) {
      redis.disconnect();
      return {
        redis: {
          status: 'down',
          message: err instanceof Error ? err.message : 'Redis ping failed',
        },
      };
    }
  }
}
