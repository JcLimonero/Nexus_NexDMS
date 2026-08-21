import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappConversation } from './entities/whatsapp-conversation.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { WhatsappCoreModule } from '../whatsapp-core/whatsapp-core.module';
import { WhatsappConversationsService } from './whatsapp-conversations.service';
import { WhatsappConversationsController } from './whatsapp-conversations.controller';

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
  ],
  controllers: [WhatsappConversationsController],
  providers: [WhatsappConversationsService],
  exports: [WhatsappConversationsService, TypeOrmModule],
})
export class WhatsappConversationsModule {}
