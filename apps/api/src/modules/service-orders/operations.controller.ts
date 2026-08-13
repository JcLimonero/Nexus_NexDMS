import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { OperationsService } from './operations.service';
import type { OperationDto } from './operations.service';
import {
  CHARGE_TYPE_LABELS,
  OperationStatusEnum,
} from './entities/service-order-operation.entity';

@ApiTags('Operaciones y fichaje')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('operations')
@RequiresModule('workshop')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  /** Catálogo de tipos de cargo, para poblar el combo sin duplicar textos. */
  @Get('charge-types')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  chargeTypes() {
    return Object.entries(CHARGE_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }

  /** Dónde está fichado el técnico ahora mismo. */
  @Get('fichaje-actual')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'MECHANIC')
  fichajeActual(@CurrentUser() user: UserPayload) {
    return this.operations.fichajeActual(user);
  }

  /** Minutos por técnico en un rango, para productividad y nómina. */
  @Get('por-tecnico')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  porTecnico(
    @CurrentUser() user: UserPayload,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.operations.porTecnico(user, desde, hasta);
  }

  @Get('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  list(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.list(user, id);
  }

  @Get('order/:serviceOrderId/productividad')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  productividad(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.productividad(user, id);
  }

  @Post('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  add(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: OperationDto,
  ) {
    return this.operations.add(user, id, dto);
  }

  @Patch(':operationId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('operationId', ParseUUIDPipe) id: string,
    @Body() dto: Partial<OperationDto> & { status?: OperationStatusEnum },
  ) {
    return this.operations.update(user, id, dto);
  }

  @Delete(':operationId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  remove(
    @CurrentUser() user: UserPayload,
    @Param('operationId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.remove(user, id);
  }

  // ─── Fichaje ────────────────────────────────────────────────

  @Post(':operationId/fichar')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  clockIn(
    @CurrentUser() user: UserPayload,
    @Param('operationId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.clockIn(user, id);
  }

  @Post(':operationId/pausar')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  clockOut(
    @CurrentUser() user: UserPayload,
    @Param('operationId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.clockOut(user, id);
  }

  @Post(':operationId/terminar')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  finish(
    @CurrentUser() user: UserPayload,
    @Param('operationId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.finish(user, id);
  }

  // ─── Vehículo de sustitución ────────────────────────────────

  /** Unidades del inventario libres para prestar hoy. */
  @Get('sustitucion/disponibles')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  unidadesSustitucion(@CurrentUser() user: UserPayload) {
    return this.operations.unidadesSustitucionDisponibles(user);
  }

  @Post('order/:serviceOrderId/sustitucion')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  prestarUnidad(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { catalogUnitId: string },
  ) {
    return this.operations.prestarSustitucion(user, id, dto.catalogUnitId);
  }

  @Post('order/:serviceOrderId/sustitucion/devolver')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  devolverUnidad(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.operations.devolverSustitucion(user, id);
  }
}
