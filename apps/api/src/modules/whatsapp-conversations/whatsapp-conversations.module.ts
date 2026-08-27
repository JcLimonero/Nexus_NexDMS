import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappConversation } from './entities/whatsapp-conversation.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { WhatsappCoreModule } from '../whatsapp-core/whatsapp-core.module';
import { StorageModule } from '../../common/storage/storage.module';
import { WhatsappConversationsService } from './whatsapp-conversations.service';
import { WhatsappConversationsController } from './whatsapp-conversations.controller';
import { WhatsappMediaProcessor } from './processors/whatsapp-media.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappConversation,
      WhatsappMessage,
      Client,
      Appointment,
      User,
    ]),
    WhatsappCoreModule,
    StorageModule,
    // La descarga de adjuntos va en segundo plano (ver WhatsappMediaProcessor):
    // el webhook de Meta no puede esperar a que baje una foto y suba a B2.
    BullModule.registerQueue({ name: 'whatsapp-media' }),
  ],
  controllers: [WhatsappConversationsController],
  providers: [WhatsappConversationsService, WhatsappMediaProcessor],
  exports: [WhatsappConversationsService, TypeOrmModule],
})
export class WhatsappConversationsModule {}
