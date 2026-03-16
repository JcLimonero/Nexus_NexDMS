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
import { CatalogUnitsService } from './catalog-units.service';
import { CreateCatalogUnitDto } from './dto/create-catalog-unit.dto';
import { UpdateCatalogUnitDto } from './dto/update-catalog-unit.dto';
import { FilterCatalogUnitsDto } from './dto/filter-catalog-units.dto';
import { UpdateCatalogUnitLocationDto } from './dto/update-location.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Catalog Units')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('catalog-units')
export class CatalogUnitsController {
  constructor(private readonly catalogUnitsService: CatalogUnitsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterCatalogUnitsDto,
  ) {
    return this.catalogUnitsService.findAll(user, filters);
  }

  @Get('scan')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  scan(
    @CurrentUser() user: UserPayload,
    @Query('serialNumber') serialNumber: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.catalogUnitsService.findBySerialNumber(
      user,
      serialNumber,
      branchId,
    );
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogUnitsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateCatalogUnitDto) {
    return this.catalogUnitsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogUnitDto,
  ) {
    return this.catalogUnitsService.update(user, id, dto);
  }

  @Patch(':id/location')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  updateLocation(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogUnitLocationDto,
  ) {
    return this.catalogUnitsService.updateLocation(user, id, dto.locationId);
  }
}
