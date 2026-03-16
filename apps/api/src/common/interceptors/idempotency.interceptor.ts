import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { RequestWithIdempotency } from '../guards/idempotency.guard';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24h

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithIdempotency>();
    const redisKey = request.idempotencyKey;

    return next.handle().pipe(
      tap({
        next: (body: unknown) => {
          void (async () => {
            if (redisKey) {
              const statusCode = 201;
              await this.redis.setex(
                redisKey,
                IDEMPOTENCY_TTL_SECONDS,
                JSON.stringify({ statusCode, body }),
              );
            }
          })();
        },
        error: () => {
          void (async () => {
            if (redisKey) {
              await this.redis.del(redisKey);
            }
          })();
        },
      }),
    );
  }
}
