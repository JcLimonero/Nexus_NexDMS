import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './processors/notifications.processor';
import { NotificationsListener } from './listeners/notifications.listener';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog]),
    BullModule.registerQueue({ name: 'notifications' }),
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
