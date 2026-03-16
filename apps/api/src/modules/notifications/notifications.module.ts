import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import { ServiceOrderFinding } from '../service-orders/entities/service-order-finding.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './processors/notifications.processor';
import { NotificationsListener } from './listeners/notifications.listener';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, ServiceOrderFinding]),
    BullModule.registerQueue({ name: 'notifications' }),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationsListener,
    WhatsAppProvider,
    EmailProvider,
    SmsProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
