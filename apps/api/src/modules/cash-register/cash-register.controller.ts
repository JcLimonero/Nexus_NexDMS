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
import { CashMovementKindEnum } from './entities/cash-movement.entity';
import { CortePdfService } from './corte-pdf.service';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@ApiTags('Cash Register')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(
    private readonly cashRegisterService: CashRegisterService,
    private readonly cortePdf: CortePdfService,
  ) {}

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

  /** Registra un movimiento manual de efectivo en la caja abierta del cajero. */
  @Post('movements')
  @Roles('SUPERADMIN', 'ADMIN', 'CASHIER')
  registerMovement(
    @CurrentUser() user: UserPayload,
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Body()
    dto: {
      kind: CashMovementKindEnum;
      amount: number;
      concept: string;
      reference?: string;
      serviceOrderId?: string;
    },
  ) {
    return this.cashRegisterService.registrarMovimiento(user, branchId, dto);
  }

  @Get('sessions/:id/movements')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  movements(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cashRegisterService.movimientos(user, id);
  }

  @Get('sessions/:id/corte')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  async corte(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.cortePdf.generar(user, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
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
