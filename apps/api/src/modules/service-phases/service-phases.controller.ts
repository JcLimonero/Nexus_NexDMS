import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ServicePhasesService } from './service-phases.service';
import { PhaseStatusEnum } from './entities/service-phase.entities';

@ApiTags('Fases del servicio')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('service-phases')
export class ServicePhasesController {
  constructor(private readonly fases: ServicePhasesService) {}

  /**
   * Qué hay en el taller ahora mismo.
   *
   * Lo lee tanto el tablero de quien gestiona como la pantalla del monitor:
   * es el mismo dato, y separarlo garantizaría que uno acabara mostrando algo
   * distinto del otro. Por eso lo alcanza también el técnico.
   */
  @Get('tablero')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  tablero(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
  ) {
    return this.fases.tablero(user.tenantId, branchId);
  }

  /**
   * El magneto plano: técnico por hora, con lo que espera turno aparte.
   *
   * Es la pantalla del taller y solo la alcanza quien trabaja en él. El
   * asesor de servicio queda fuera a propósito: su pantalla es la agenda del
   * día, y dejar que cada monitor entrara con cualquier cuenta convertía la
   * separación en una recomendación.
   */
  @Get('magneto')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'MECHANIC')
  magneto(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.fases.magneto(user.tenantId, branchId, date);
  }

  @Get('paquete/:kitId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  delPaquete(@Param('kitId', ParseUUIDPipe) kitId: string) {
    return this.fases.fasesDelPaquete(kitId);
  }

  @Put('paquete/:kitId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  guardarDelPaquete(
    @Param('kitId', ParseUUIDPipe) kitId: string,
    @Body()
    dto: {
      fases: {
        name: string;
        description?: string;
        estimatedMin: number;
        role?: string;
      }[];
    },
  ) {
    return this.fases.guardarFasesDelPaquete(kitId, dto.fases ?? []);
  }

  @Get('orden/:serviceOrderId')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  deLaOrden(@Param('serviceOrderId', ParseUUIDPipe) id: string) {
    return this.fases.fasesDeLaOrden(id);
  }

  @Post('orden/:serviceOrderId/aplicar/:kitId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  aplicar(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Param('kitId', ParseUUIDPipe) kitId: string,
  ) {
    return this.fases.aplicarPaquete(serviceOrderId, kitId);
  }

  /** El técnico mueve su propia fase; por eso alcanza este endpoint. */
  @Patch(':id/estado')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: PhaseStatusEnum; assignedUserId?: string | null },
  ) {
    return this.fases.cambiarEstado(id, dto.status, dto.assignedUserId);
  }

  @Patch(':id/asignar')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  asignar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { userId: string | null },
  ) {
    return this.fases.asignar(id, dto.userId);
  }
}
