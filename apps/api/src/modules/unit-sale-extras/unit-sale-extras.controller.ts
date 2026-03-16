import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { UnitSaleExtrasService } from './unit-sale-extras.service';
import { CreateUnitSaleExtraDto } from './dto/create-unit-sale-extra.dto';
import { UpdateUnitSaleExtraDto } from './dto/update-unit-sale-extra.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { UnitSalesService } from '../unit-sales/unit-sales.service';

@ApiTags('Unit Sale Extras')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-sales/:saleId/extras')
export class UnitSaleExtrasController {
  constructor(
    private readonly unitSaleExtrasService: UnitSaleExtrasService,
    private readonly unitSalesService: UnitSalesService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER', 'EXECUTIVE')
  findAll(
    @CurrentUser() user: UserPayload,
    @Param('saleId', ParseUUIDPipe) saleId: string,
  ) {
    return this.unitSalesService
      .findOne(user, saleId)
      .then((sale) => this.unitSaleExtrasService.findAllForSale(sale.id));
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() dto: CreateUnitSaleExtraDto,
  ) {
    return this.unitSalesService
      .findOne(user, saleId)
      .then((sale) =>
        this.unitSaleExtrasService.create(user, sale.id, sale.status, dto),
      );
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitSaleExtraDto,
  ) {
    return this.unitSalesService
      .findOne(user, saleId)
      .then((sale) =>
        this.unitSaleExtrasService.update(user, id, sale.status, dto),
      );
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  delete(
    @CurrentUser() user: UserPayload,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitSalesService
      .findOne(user, saleId)
      .then((sale) => this.unitSaleExtrasService.delete(user, id, sale.status));
  }
}
