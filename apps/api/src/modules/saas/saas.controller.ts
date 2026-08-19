import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SaasService } from './saas.service';
import { PALETAS } from '../tenants/branding.paletas';
import { SaasPayment, SaasPlan } from './entities/saas.entities';

/**
 * Administración del SaaS: lo que ve Nexus Q Tech, no el concesionario.
 *
 * Todo es SUPERADMIN. Aquí se ven precios y adeudos de todos los clientes,
 * así que no hay grado intermedio: o se administra el negocio o no.
 */
@ApiTags('Administración SaaS')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller('saas')
export class SaasController {
  constructor(private readonly saas: SaasService) {}

  /** Cuánto se factura al mes y quién debe. */
  @Get('overview')
  panorama() {
    return this.saas.panorama();
  }

  @Get('plans')
  planes() {
    return this.saas.planes();
  }

  @Post('plans')
  crearPlan(@Body() dto: Partial<SaasPlan>) {
    return this.saas.crearPlan(dto);
  }

  @Patch('plans/:id')
  guardarPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<SaasPlan>,
  ) {
    return this.saas.guardarPlan(id, dto);
  }

  @Delete('plans/:id')
  eliminarPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.saas.eliminarPlan(id);
  }

  /** Catálogo de módulos con su precio como contratación aparte. */
  @Get('module-prices')
  preciosDeModulos() {
    return this.saas.preciosDeModulos();
  }

  @Put('module-prices/:moduleKey')
  guardarPrecioModulo(
    @Param('moduleKey') moduleKey: string,
    @Body() dto: { monthlyPrice: number },
  ) {
    return this.saas.guardarPrecioModulo(moduleKey, dto.monthlyPrice);
  }

  // ─── Marca del cliente ───────────────────────────

  /** Las paletas entre las que puede elegir. */
  @Get('branding/paletas')
  paletas() {
    return PALETAS;
  }

  @Get('tenants/:id/branding')
  branding(@Param('id', ParseUUIDPipe) id: string) {
    return this.saas.branding(id);
  }

  @Put('tenants/:id/branding')
  guardarBranding(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: { paletaId?: string; logoKey?: string | null; iconKey?: string | null },
  ) {
    return this.saas.guardarBranding(id, dto);
  }

  @Post('tenants/:id/branding/logo')
  @UseInterceptors(FileInterceptor('file'))
  subirLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.saas.subirLogo(id, file);
  }

  @Post('tenants/:id/branding/icon')
  @UseInterceptors(FileInterceptor('file'))
  subirIcono(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.saas.subirIcono(id, file);
  }

  /** Todo lo del cliente: ficha, cobro mensual, módulos e historial. */
  @Get('tenants/:id')
  ficha(@Param('id', ParseUUIDPipe) id: string) {
    return this.saas.ficha(id);
  }

  @Patch('tenants/:id')
  guardarFicha(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Tenant>,
  ) {
    return this.saas.guardarFicha(id, dto);
  }

  @Get('tenants/:id/payments')
  pagos(@Param('id', ParseUUIDPipe) id: string) {
    return this.saas.pagos(id);
  }

  @Post('tenants/:id/payments')
  registrarPago(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<SaasPayment>,
  ) {
    return this.saas.registrarPago(id, dto);
  }

  @Delete('payments/:id')
  eliminarPago(@Param('id', ParseUUIDPipe) id: string) {
    return this.saas.eliminarPago(id);
  }
}
