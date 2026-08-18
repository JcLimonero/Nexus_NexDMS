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
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import {
  ConvertRequisitionsDto,
  CreateRequisitionDto,
} from './dto/requisition.dto';
import { RequisitionStatusEnum } from './entities/purchase-requisition.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Purchase Requisitions')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('purchase-requisitions')
export class PurchaseRequisitionsController {
  constructor(private readonly service: PurchaseRequisitionsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: RequisitionStatusEnum,
  ) {
    return this.service.findAll(user, status);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateRequisitionDto,
  ) {
    return this.service.create(user, dto);
  }

  @Post('convert')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  convert(
    @CurrentUser() user: UserPayload,
    @Body() dto: ConvertRequisitionsDto,
  ) {
    return this.service.convertToOrder(user, dto);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(user, id);
  }
}
