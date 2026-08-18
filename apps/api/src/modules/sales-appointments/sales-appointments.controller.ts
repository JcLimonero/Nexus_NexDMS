import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SalesAppointmentsService } from './sales-appointments.service';
import {
  CreateSalesAppointmentDto,
  UpdateSalesAppointmentStatusDto,
} from './dto/sales-appointment.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Sales Appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sales-appointments')
export class SalesAppointmentsController {
  constructor(private readonly service: SalesAppointmentsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user, { from, to, status });
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateSalesAppointmentDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id/status')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  updateStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesAppointmentStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }
}
