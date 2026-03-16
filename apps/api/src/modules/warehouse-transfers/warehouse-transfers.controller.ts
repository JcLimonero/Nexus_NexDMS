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
import { WarehouseTransfersService } from './warehouse-transfers.service';
import { CreateWarehouseTransferDto } from './dto/create-warehouse-transfer.dto';
import { UpdateWarehouseTransferDto } from './dto/update-warehouse-transfer.dto';
import { FilterWarehouseTransfersDto } from './dto/filter-warehouse-transfers.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Warehouse Transfers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('warehouse-transfers')
export class WarehouseTransfersController {
  constructor(
    private readonly warehouseTransfersService: WarehouseTransfersService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterWarehouseTransfersDto,
  ) {
    return this.warehouseTransfersService.findAll(user, filters);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTransfersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateWarehouseTransferDto,
  ) {
    return this.warehouseTransfersService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseTransferDto,
  ) {
    return this.warehouseTransfersService.update(user, id, dto);
  }

  @Post(':id/approve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  approve(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTransfersService.approve(user, id);
  }

  @Post(':id/send')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  send(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTransfersService.send(user, id);
  }

  @Post(':id/receive')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  receive(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTransfersService.receive(user, id);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTransfersService.cancel(user, id);
  }
}
