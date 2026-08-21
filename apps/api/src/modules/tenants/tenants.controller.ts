import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('SUPERADMIN')
  findAll(@CurrentUser() user: UserPayload) {
    return this.tenantsService.findAll(user);
  }

  /** Módulos activos del tenant del usuario logueado (para armar el menú). */
  @Get('me/modules')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getMyModules(@CurrentUser() user: UserPayload) {
    return this.tenantsService.getEnabledModules(user.tenantId);
  }

  /** Actualiza los módulos activos del tenant del usuario (ADMIN). */
  @Patch('me/modules')
  @Roles('SUPERADMIN', 'ADMIN')
  updateMyModules(
    @CurrentUser() user: UserPayload,
    @Body() body: { enabledModules: string[] | null },
  ) {
    return this.tenantsService.setEnabledModules(
      user.tenantId,
      body.enabledModules,
    );
  }

  /**
   * Módulos de CUALQUIER tenant, desde el portal de administración.
   *
   * Va aparte de `me/modules` porque el destinatario es distinto: aquí el
   * superadmin ajusta la licencia de un cliente del SaaS, no la suya.
   */
  @Get(':id/modules')
  @Roles('SUPERADMIN')
  getTenantModules(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getEnabledModules(id);
  }

  @Patch(':id/modules')
  @Roles('SUPERADMIN')
  updateTenantModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { enabledModules: string[] | null },
  ) {
    return this.tenantsService.setEnabledModules(id, body.enabledModules);
  }

  /** Flujo de estatus de taller del tenant (configurable). */
  @Get('me/service-flow')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getMyServiceFlow(@CurrentUser() user: UserPayload) {
    return this.tenantsService.getServiceFlow(user.tenantId);
  }

  @Patch('me/service-flow')
  @Roles('SUPERADMIN', 'ADMIN')
  updateMyServiceFlow(
    @CurrentUser() user: UserPayload,
    @Body() body: { serviceFlow: Record<string, string[]> | null },
  ) {
    return this.tenantsService.setServiceFlow(user.tenantId, body.serviceFlow);
  }

  /** Reglas de "salir con adeudo" (R6) del tenant. */
  @Get('me/credit-config')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  getMyCreditConfig(@CurrentUser() user: UserPayload) {
    return this.tenantsService.getCreditConfig(user.tenantId);
  }

  @Patch('me/credit-config')
  @Roles('SUPERADMIN', 'ADMIN')
  updateMyCreditConfig(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      creditConfig: { promiseDaysCap?: number; creditCheckEnabled?: boolean } | null;
    },
  ) {
    return this.tenantsService.setCreditConfig(user.tenantId, body.creditConfig);
  }

  /** Divisa del tenant (ISO 4217). */
  @Get('me/currency')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  getMyCurrency(@CurrentUser() user: UserPayload) {
    return this.tenantsService.getCurrency(user.tenantId);
  }

  @Patch('me/currency')
  @Roles('SUPERADMIN', 'ADMIN')
  updateMyCurrency(
    @CurrentUser() user: UserPayload,
    @Body() body: { currency: string },
  ) {
    return this.tenantsService.setCurrency(user.tenantId, body.currency);
  }

  @Get('me/commission-config')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  getMyCommissionConfig(@CurrentUser() user: UserPayload) {
    return this.tenantsService.getCommissionConfig(user.tenantId);
  }

  @Patch('me/commission-config')
  @Roles('SUPERADMIN', 'ADMIN')
  updateMyCommissionConfig(
    @CurrentUser() user: UserPayload,
    @Body() body: { exemptChargeTypes: string[] },
  ) {
    return this.tenantsService.setCommissionConfig(
      user.tenantId,
      body.exemptChargeTypes,
    );
  }

  @Get(':id')
  @Roles('SUPERADMIN')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tenantsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(user, id, dto);
  }

  @Patch(':id/suspend')
  @Roles('SUPERADMIN')
  suspend(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    return this.tenantsService.suspend(user, id, body?.reason);
  }

  /** Bitácora de cambios de estatus (suspender/reactivar) del cliente. */
  @Get(':id/status-history')
  @Roles('SUPERADMIN')
  statusHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.statusHistory(id);
  }
}
