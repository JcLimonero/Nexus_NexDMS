import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappBotController } from './whatsapp-bot.controller';
import { WhatsappBotService } from './whatsapp-bot.service';
import { Branch } from '../branches/entities/branch.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UserAvailabilityModule } from '../user-availability/user-availability.module';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, ServiceType]),
    AppointmentsModule,
    UserAvailabilityModule,
  ],
  controllers: [WhatsappBotController],
  providers: [WhatsappBotService, WhatsAppProvider],
})
export class WhatsappBotModule {}
