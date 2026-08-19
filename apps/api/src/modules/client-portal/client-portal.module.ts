import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { PortalMessage, PortalUser } from './entities/portal.entities';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import { DocumentSignature } from '../signatures/entities/document-signature.entity';
import { ClientPortalService } from './client-portal.service';
import {
  ClientPortalAuthController,
  ClientPortalController,
} from './client-portal.controller';
import { PortalSessionGuard } from './portal-session.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

/** El mismo hilo de conversación, desde el mostrador. */
@ApiTags('Conversación con el cliente')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('client-chat')
export class StaffChatController {
  constructor(private readonly portal: ClientPortalService) {}

  /** Bandeja: qué órdenes tienen mensajes del cliente sin leer. */
  @Get('pendientes')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  pendientes(@CurrentUser() user: UserPayload) {
    return this.portal.pendientesStaff(user.tenantId);
  }

  @Get('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  mensajes(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.portal.mensajesStaff(user.tenantId, id);
  }

  @Post('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  escribir(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { body: string },
  ) {
    return this.portal.escribirStaff(user.tenantId, user.sub, id, dto.body);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortalUser,
      PortalMessage,
      Client,
      ServiceOrder,
      CustomerVehicle,
      Appointment,
      ServiceSurvey,
      DocumentSignature,
    ]),
    // AuthModule exporta JwtModule, que es lo que firma la sesión del portal.
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    ClientPortalAuthController,
    ClientPortalController,
    StaffChatController,
  ],
  providers: [ClientPortalService, PortalSessionGuard],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
