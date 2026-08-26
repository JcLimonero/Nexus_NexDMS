import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeminiClient } from './gemini.client';
import { WhatsappAssistantService } from './whatsapp-assistant.service';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UserAvailabilityModule } from '../user-availability/user-availability.module';
import { WhatsappConversationsModule } from '../whatsapp-conversations/whatsapp-conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceType, Branch]),
    AppointmentsModule,
    UserAvailabilityModule,
    WhatsappConversationsModule,
  ],
  providers: [GeminiClient, WhatsappAssistantService],
  exports: [GeminiClient, WhatsappAssistantService],
})
export class WhatsappAiModule {}
