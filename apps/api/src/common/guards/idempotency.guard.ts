import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { Redis } from 'ioredis';

export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24h

export interface RequestWithIdempotency extends Request {
  user?: { tenantId?: string };
  idempotencyKey?: string;
}

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithIdempotency>();
    const key = request.header(IDEMPOTENCY_KEY_HEADER);

    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new BadRequestException(
        `Header ${IDEMPOTENCY_KEY_HEADER} es requerido`,
      );
    }

    const tenantId = request.user?.tenantId ?? 'anonymous';
    const redisKey = `idempotency:${tenantId}:${key.trim()}`;

    const existing = await this.redis.get(redisKey);
    if (existing) {
      if (existing === 'pending') {
        throw new BadRequestException(
          'Solicitud duplicada: la petición anterior aún está en proceso',
        );
      }
      try {
        const parsed = JSON.parse(existing) as {
          statusCode: number;
          body: unknown;
        };
        throw new IdempotencyConflictException(parsed.body, parsed.statusCode);
      } catch (e) {
        if (e instanceof IdempotencyConflictException) throw e;
        throw new BadRequestException('Solicitud duplicada detectada');
      }
    }

    await this.redis.setex(redisKey, IDEMPOTENCY_TTL_SECONDS, 'pending');
    request.idempotencyKey = redisKey;
    return true;
  }
}

export class IdempotencyConflictException extends BadRequestException {
  constructor(
    public readonly cachedResponse: unknown,
    public readonly cachedStatusCode: number,
  ) {
    super('Solicitud duplicada: ya existe una respuesta para esta clave');
  }
}
