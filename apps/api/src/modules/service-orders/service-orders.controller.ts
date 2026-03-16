import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FilterServiceOrdersDto } from './dto/filter-service-orders.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AddPartDto } from './dto/add-part.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { AssignMechanicDto } from './dto/assign-mechanic.dto';
import { DeliverServiceOrderDto } from './dto/deliver-service-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Service Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterServiceOrdersDto,
  ) {
    return this.serviceOrdersService.findAll(user, filters);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user, id, dto);
  }

  @Post(':id/change-status')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  changeStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.serviceOrdersService.changeStatus(user, id, dto);
  }

  @Post(':id/assign-mechanic')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  assignMechanic(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignMechanicDto,
  ) {
    return this.serviceOrdersService.assignMechanic(user, id, dto.mechanicId);
  }

  @Post(':id/parts')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  addPart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartDto,
  ) {
    return this.serviceOrdersService.addPart(user, id, dto);
  }

  @Delete(':id/parts/:osPartId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  removePart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('osPartId', ParseUUIDPipe) osPartId: string,
  ) {
    return this.serviceOrdersService.removePart(user, id, osPartId);
  }

  @Post(':id/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  createChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.serviceOrdersService.createChecklist(user, id, dto);
  }

  @Get(':id/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const so = await this.serviceOrdersService.findOne(user, id);
    if (!so.checklist) {
      throw new NotFoundException('No existe checklist para esta OS');
    }
    return so.checklist;
  }

  @Post(':id/time/start')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  startTime(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.startTime(user, id);
  }

  @Post(':id/time/pause')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  pauseTime(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.pauseTime(user, id);
  }

  @Get(':id/time')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getTimeSummary(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.getTimeSummary(user, id);
  }

  @Post(':id/deliver')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  deliver(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverServiceOrderDto,
  ) {
    return this.serviceOrdersService.deliver(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.cancel(user, id);
  }
}
