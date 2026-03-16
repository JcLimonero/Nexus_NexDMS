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
import { CashRegisterService } from './cash-register.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { FilterCashSessionsDto } from './dto/filter-cash-sessions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Cash Register')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('active-session')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  getActiveSession(
    @CurrentUser() user: UserPayload,
    @Query('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.cashRegisterService.getActiveSession(user, branchId);
  }

  @Post('open')
  @Roles('SUPERADMIN', 'ADMIN', 'CASHIER')
  open(@CurrentUser() user: UserPayload, @Body() dto: OpenCashSessionDto) {
    return this.cashRegisterService.open(user, dto);
  }

  @Post('close')
  @Roles('SUPERADMIN', 'ADMIN', 'CASHIER')
  close(
    @CurrentUser() user: UserPayload,
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.cashRegisterService.close(user, branchId, dto);
  }

  @Get('sessions')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterCashSessionsDto,
  ) {
    return this.cashRegisterService.findAll(user, filters);
  }

  @Get('sessions/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cashRegisterService.findOne(user, id);
  }
}
