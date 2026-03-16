import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserAvailabilityService } from './user-availability.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('User Availability')
@Controller('user-availability')
export class UserAvailabilityController {
  constructor(
    private readonly userAvailabilityService: UserAvailabilityService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('slots')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getAvailableSlots(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('mechanicId') mechanicId?: string,
    @Query('durationMin') durationMin?: number,
    @Query('serviceTypeId') serviceTypeId?: string,
  ) {
    return this.userAvailabilityService.getAvailableSlots(
      branchId,
      date,
      mechanicId,
      durationMin ? Number(durationMin) : undefined,
      serviceTypeId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('mechanics')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getMechanicsForBranch(@Query('branchId') branchId: string) {
    return this.userAvailabilityService.getMechanicsForBranch(branchId);
  }
}
