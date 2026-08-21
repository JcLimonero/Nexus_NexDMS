import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappBotController } from './whatsapp-bot.controller';
import { WhatsappBotService } from './whatsapp-bot.service';
import { WhatsappSignatureGuard } from './whatsapp-signature.guard';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UserAvailabilityModule } from '../user-availability/user-availability.module';
import { WhatsappCoreModule } from '../whatsapp-core/whatsapp-core.module';
import { WhatsappConversationsModule } from '../whatsapp-conversations/whatsapp-conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceType]),
    AppointmentsModule,
    UserAvailabilityModule,
    WhatsappCoreModule,
    WhatsappConversationsModule,
  ],
  controllers: [WhatsappBotController],
  providers: [WhatsappBotService, WhatsappSignatureGuard],
})
export class WhatsappBotModule {}
