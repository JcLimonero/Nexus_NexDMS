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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { StockCountsService } from './stock-counts.service';
import { OpenCountDto } from './dto/open-count.dto';
import { SaveCountsDto } from './dto/save-counts.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Stock Counts')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('warehouse')
@Controller('stock-counts')
export class StockCountsController {
  constructor(private readonly service: StockCountsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.findAll(user, branchId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  open(@CurrentUser() user: UserPayload, @Body() dto: OpenCountDto) {
    return this.service.open(user, dto);
  }

  @Post(':id/lines')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  saveCounts(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveCountsDto,
  ) {
    return this.service.saveCounts(user, id, dto);
  }

  @Post(':id/apply')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  apply(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.apply(user, id);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(user, id);
  }
}
