import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { FleetsService } from './fleets.service';
import type {
  ActualizarConvenioDto,
  CrearConvenioDto,
} from './fleets.service';

const GESTION = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] as const;

/**
 * Convenios de flotilla: empresas con varias unidades y precios preferenciales.
 * Módulo propio con su key de licencia; el descuento que definen aquí lo
 * aplican solos el taller, el mostrador y la venta de unidades.
 */
@ApiTags('Flotillas')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('fleets')
@Controller('fleets')
export class FleetsController {
  constructor(private readonly fleets: FleetsService) {}

  @Get()
  @Roles(...GESTION)
  listar(@CurrentUser() user: UserPayload) {
    return this.fleets.listar(user);
  }

  @Post()
  @Roles(...GESTION)
  crear(@CurrentUser() user: UserPayload, @Body() dto: CrearConvenioDto) {
    return this.fleets.crear(user, dto);
  }

  @Get(':id')
  @Roles(...GESTION)
  detalle(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fleets.detalle(user, id);
  }

  @Patch(':id')
  @Roles(...GESTION)
  actualizar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarConvenioDto,
  ) {
    return this.fleets.actualizar(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  eliminar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fleets.eliminar(user, id);
  }

  @Get(':id/available-units')
  @Roles(...GESTION)
  unidadesDisponibles(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fleets.unidadesDisponibles(user, id);
  }

  @Post(':id/units')
  @Roles(...GESTION)
  agregarUnidad(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.fleets.agregarUnidad(user, id, vehicleId);
  }

  @Delete('units/:unitId')
  @Roles(...GESTION)
  quitarUnidad(
    @CurrentUser() user: UserPayload,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ) {
    return this.fleets.quitarUnidad(user, unitId);
  }
}
