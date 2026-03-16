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
import { StockLocationsService } from './stock-locations.service';
import { CreateStockLocationDto } from './dto/create-stock-location.dto';
import { UpdateStockLocationDto } from './dto/update-stock-location.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Stock Locations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('stock-locations')
export class StockLocationsController {
  constructor(private readonly stockLocationsService: StockLocationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.stockLocationsService.findAll(user, branchId);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateStockLocationDto) {
    return this.stockLocationsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockLocationDto,
  ) {
    return this.stockLocationsService.update(user, id, dto);
  }
}
