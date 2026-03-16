import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { getQueueConnection } from '../config/queue.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getQueueConnection(config),
      }),
    }),
    BullModule.registerQueue({ name: 'notifications' }, { name: 'cfdi' }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
