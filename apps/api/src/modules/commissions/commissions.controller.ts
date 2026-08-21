import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CommissionsService } from './commissions.service';
import { CreateCommissionPeriodDto } from './dto/create-commission-period.dto';
import { CreateCommissionDetailDto } from './dto/create-commission-detail.dto';
import { FilterCommissionPeriodsDto } from './dto/filter-commissions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('periods')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')
  findAllPeriods(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterCommissionPeriodsDto,
  ) {
    return this.commissionsService.findAllPeriods(user, filters);
  }

  /** Cálculo de comisión de un mecánico en un rango (from/to = YYYY-MM-DD). */
  @Get('preview')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')
  preview(
    @CurrentUser() user: UserPayload,
    @Query('mechanicId', ParseUUIDPipe) mechanicId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.commissionsService.previewMecanico(user, mechanicId, from, to);
  }

  @Get('periods/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')
  findOnePeriod(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissionsService.findOnePeriod(user, id);
  }

  @Post('periods')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createPeriod(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateCommissionPeriodDto,
  ) {
    return this.commissionsService.createPeriod(user, dto);
  }

  @Post('periods/:id/submit-review')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  submitForReview(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissionsService.submitForReview(user, id);
  }

  @Post('periods/:id/approve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  approvePeriod(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissionsService.approvePeriod(user, id);
  }

  @Post('periods/:id/mark-paid')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  markAsPaid(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissionsService.markAsPaid(user, id);
  }

  @Post('details')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createDetail(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateCommissionDetailDto,
  ) {
    return this.commissionsService.createDetail(user, dto);
  }
}
