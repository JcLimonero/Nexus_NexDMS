import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StockMovementsService } from './stock-movements.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { FilterStockMovementsDto } from './dto/filter-stock-movements.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('stock-movements')
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterStockMovementsDto,
  ) {
    return this.stockMovementsService.findAll(user, filters);
  }

  @Post('adjustment')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  createAdjustment(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.stockMovementsService.createAdjustment(user, dto);
  }
}
