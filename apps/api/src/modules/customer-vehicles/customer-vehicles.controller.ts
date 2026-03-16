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
import { CustomerVehiclesService } from './customer-vehicles.service';
import { CreateCustomerVehicleDto } from './dto/create-customer-vehicle.dto';
import { UpdateCustomerVehicleDto } from './dto/update-customer-vehicle.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Customer Vehicles')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('clients/:clientId/vehicles')
export class CustomerVehiclesController {
  constructor(
    private readonly customerVehiclesService: CustomerVehiclesService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.customerVehiclesService.findAllByClient(user, clientId);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateCustomerVehicleDto,
  ) {
    return this.customerVehiclesService.create(user, clientId, dto);
  }

  @Patch(':vehicleId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: UpdateCustomerVehicleDto,
  ) {
    return this.customerVehiclesService.update(
      user,
      clientId,
      vehicleId,
      dto,
    );
  }
}
