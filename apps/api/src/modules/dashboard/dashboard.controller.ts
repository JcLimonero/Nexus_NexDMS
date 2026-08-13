import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ModuleDashboardService } from './module-dashboard.service';
import { ModulesService } from '../modules/modules.module';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly moduleDashboardService: ModuleDashboardService,
    private readonly modulesService: ModulesService,
  ) {}

  @Get('summary')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  getSummary(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getSummary(user, branchId || undefined);
  }

  /**
   * Dashboard de un módulo concreto. Se valida la licencia aquí porque la
   * clave del módulo llega como parámetro (el guard declarativo espera
   * un módulo fijo por endpoint).
   */
  @Get('module/:key')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  async getModuleDashboard(
    @CurrentUser() user: UserPayload,
    @Param('key') key: string,
    @Query('branchId') branchId?: string,
  ) {
    const allowed =
      user.roles?.includes('SUPERADMIN') ||
      (await this.modulesService.isActive(user.tenantId, key));
    if (!allowed) {
      throw new ForbiddenException(
        `El módulo "${key}" no está incluido en tu licencia.`,
      );
    }
    return this.moduleDashboardService.get(user, key, branchId || undefined);
  }
}
