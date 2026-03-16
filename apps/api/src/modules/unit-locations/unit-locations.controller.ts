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
import { UnitLocationsService } from './unit-locations.service';
import { CreateUnitLocationDto } from './dto/create-unit-location.dto';
import { UpdateUnitLocationDto } from './dto/update-unit-location.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Locations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-locations')
export class UnitLocationsController {
  constructor(private readonly unitLocationsService: UnitLocationsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.unitLocationsService.findAll(user, branchId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitLocationsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateUnitLocationDto) {
    return this.unitLocationsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitLocationDto,
  ) {
    return this.unitLocationsService.update(user, id, dto);
  }
}
