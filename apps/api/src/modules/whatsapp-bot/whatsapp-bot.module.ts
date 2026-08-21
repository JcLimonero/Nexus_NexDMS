import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappBotController } from './whatsapp-bot.controller';
import { WhatsappBotService } from './whatsapp-bot.service';
import { WhatsappRoutingService } from './whatsapp-routing.service';
import { WhatsappSignatureGuard } from './whatsapp-signature.guard';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UserAvailabilityModule } from '../user-availability/user-availability.module';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import { SharedModule } from '../../shared/shared.module';
import { WhatsappConversationsModule } from '../whatsapp-conversations/whatsapp-conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchConfig, ServiceType]),
    AppointmentsModule,
    UserAvailabilityModule,
    SharedModule,
    WhatsappConversationsModule,
  ],
  controllers: [WhatsappBotController],
  providers: [
    WhatsappBotService,
    WhatsappRoutingService,
    WhatsappSignatureGuard,
    WhatsAppProvider,
  ],
  exports: [WhatsappRoutingService],
})
export class WhatsappBotModule {}
