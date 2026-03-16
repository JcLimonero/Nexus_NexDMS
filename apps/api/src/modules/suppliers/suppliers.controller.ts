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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { FilterSuppliersDto } from './dto/filter-suppliers.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterSuppliersDto,
  ) {
    return this.suppliersService.findAll(user, filters);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.suppliersService.softDelete(user, id);
    return { deleted: true };
  }
}
