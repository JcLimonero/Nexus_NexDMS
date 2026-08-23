import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MasterCatalogsService } from './master-catalogs.service';

/**
 * Gestor de catálogos maestros (plantillas del wizard de alta). Solo superadmin
 * de Nexus. Opera siempre sobre el tenant maestro.
 */
@ApiTags('master-catalogs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('master-catalogs')
export class MasterCatalogsController {
  constructor(private readonly service: MasterCatalogsService) {}

  @Get()
  @Roles('SUPERADMIN')
  catalogos() {
    return this.service.listarCatalogos();
  }

  @Get(':key')
  @Roles('SUPERADMIN')
  entradas(@Param('key') key: string) {
    return this.service.entradas(key);
  }

  @Post(':key')
  @Roles('SUPERADMIN')
  crear(@Param('key') key: string, @Body() body: Record<string, unknown>) {
    return this.service.crear(key, body);
  }

  @Patch(':key/:id')
  @Roles('SUPERADMIN')
  actualizar(
    @Param('key') key: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.actualizar(key, id, body);
  }

  @Delete(':key/:id')
  @Roles('SUPERADMIN')
  eliminar(@Param('key') key: string, @Param('id') id: string) {
    return this.service.eliminar(key, id);
  }
}
