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
import { VehicleHistoryService } from './vehicle-history.service';

@ApiTags('Historial del vehículo')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('vehicle-history')
export class VehicleHistoryController {
  constructor(private readonly historia: VehicleHistoryService) {}

  /** Ficha del vehículo: dueños que ha tenido y servicios que se le han hecho. */
  @Get('vehiculo/:vehicleId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST', 'SELLER')
  ficha(
    @CurrentUser() user: UserPayload,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.historia.fichaDelVehiculo(user.tenantId, vehicleId);
  }

  /** Los vehículos que tiene y tuvo un cliente. */
  @Get('cliente/:clientId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST', 'SELLER')
  delCliente(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.historia.vehiculosDelCliente(user.tenantId, clientId);
  }

  /** Pasa el vehículo a otro cliente sin perder lo anterior. */
  @Post('vehiculo/:vehicleId/traspasar')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  traspasar(
    @CurrentUser() user: UserPayload,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: { clientId: string; fecha?: string; notas?: string },
  ) {
    return this.historia.traspasar(user.tenantId, vehicleId, dto);
  }
}
