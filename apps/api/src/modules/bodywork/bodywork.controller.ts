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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { BodyworkService } from './bodywork.service';
import type {
  ActualizarOrdenDto,
  CrearOrdenDto,
  ItemDto,
  PiezaDto,
} from './bodywork.service';
import { BodyworkStatusEnum } from './entities/bodywork-order.entity';

const OPERATIVOS = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'EXECUTIVE',
  'RECEPTIONIST',
  'CASHIER',
  'MECHANIC',
] as const;

/**
 * Hojalatería y Pintura: módulo propio, separado del taller mecánico. Hay
 * talleres de carrocería que contratan solo esta parte, así que va con su
 * propia key de licencia.
 */
@ApiTags('Hojalatería y Pintura')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('bodywork')
@Controller('bodywork')
export class BodyworkController {
  constructor(private readonly bodywork: BodyworkService) {}

  // ── Catálogo de piezas ──
  @Get('catalog/parts')
  @Roles(...OPERATIVOS)
  catalogo(@CurrentUser() user: UserPayload) {
    return this.bodywork.listarCatalogo(user);
  }

  @Post('catalog/parts')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  crearPieza(@CurrentUser() user: UserPayload, @Body() dto: PiezaDto) {
    return this.bodywork.crearPieza(user, dto);
  }

  @Patch('catalog/parts/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  actualizarPieza(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<PiezaDto>,
  ) {
    return this.bodywork.actualizarPieza(user, id, dto);
  }

  @Delete('catalog/parts/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  eliminarPieza(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bodywork.eliminarPieza(user, id);
  }

  // ── Órdenes ──
  @Get()
  @Roles(...OPERATIVOS)
  listar(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: BodyworkStatusEnum,
  ) {
    return this.bodywork.listar(user, status);
  }

  @Post()
  @Roles(...OPERATIVOS)
  crear(@CurrentUser() user: UserPayload, @Body() dto: CrearOrdenDto) {
    return this.bodywork.crear(user, dto);
  }

  @Get(':id')
  @Roles(...OPERATIVOS)
  detalle(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bodywork.detalle(user, id);
  }

  @Patch(':id')
  @Roles(...OPERATIVOS)
  actualizar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarOrdenDto,
  ) {
    return this.bodywork.actualizar(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  eliminar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bodywork.eliminar(user, id);
  }

  // ── Partidas ──
  @Post(':id/items')
  @Roles(...OPERATIVOS)
  agregarItem(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ItemDto,
  ) {
    return this.bodywork.agregarItem(user, id, dto);
  }

  @Patch('items/:itemId')
  @Roles(...OPERATIVOS)
  actualizarItem(
    @CurrentUser() user: UserPayload,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: Partial<ItemDto>,
  ) {
    return this.bodywork.actualizarItem(user, itemId, dto);
  }

  @Delete('items/:itemId')
  @Roles(...OPERATIVOS)
  eliminarItem(
    @CurrentUser() user: UserPayload,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.bodywork.eliminarItem(user, itemId);
  }

  // ── Fotos ──
  @Post(':id/photos')
  @Roles(...OPERATIVOS)
  @UseInterceptors(FileInterceptor('file'))
  subirFoto(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
    @Body('itemId') itemId?: string,
    @Body('caption') caption?: string,
  ) {
    return this.bodywork.subirFoto(user, id, file, itemId, caption);
  }

  @Delete('photos/:photoId')
  @Roles(...OPERATIVOS)
  eliminarFoto(
    @CurrentUser() user: UserPayload,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.bodywork.eliminarFoto(user, photoId);
  }
}
