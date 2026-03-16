import { Module } from '@nestjs/common';
import { IdempotencyGuard } from '../guards/idempotency.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';

@Module({
  providers: [IdempotencyGuard, IdempotencyInterceptor],
  exports: [IdempotencyGuard, IdempotencyInterceptor],
})
export class IdempotencyModule {}
