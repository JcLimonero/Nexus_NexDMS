import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ServicePlanningService } from './service-planning.service';
import { FilterVehiclesDueDto } from './dto/filter-vehicles-due.dto';
import { BranchesService } from '../branches/branches.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Service Planning')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('service-planning')
export class ServicePlanningController {
  constructor(
    private readonly servicePlanningService: ServicePlanningService,
    private readonly branchesService: BranchesService,
  ) {}

  @Get('due')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'AFTERSALES_MANAGER')
  async getVehiclesDue(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterVehiclesDueDto,
  ) {
    await this.branchesService.assertBranchInScope(user, filters.branchId);
    return this.servicePlanningService.getVehiclesDueForService(
      filters.branchId,
      filters.serviceTypeId,
      filters.daysAhead ?? 14,
      filters.kmAhead ?? 500,
    );
  }
}
