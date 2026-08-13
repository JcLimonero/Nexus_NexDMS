import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';

const KINDS = { receivables: 'receivable', payables: 'payable' } as const;

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('finance')
@RequiresModule('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get(':kind')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  list(
    @CurrentUser() user: UserPayload,
    @Param('kind') kind: keyof typeof KINDS,
    @Query('status') status?: string,
  ) {
    return this.financeService.list(user, KINDS[kind], status);
  }

  @Get(':kind/aging')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  aging(
    @CurrentUser() user: UserPayload,
    @Param('kind') kind: keyof typeof KINDS,
  ) {
    return this.financeService.aging(user, KINDS[kind]);
  }

  @Post(':kind')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  create(
    @CurrentUser() user: UserPayload,
    @Param('kind') kind: keyof typeof KINDS,
    @Body()
    dto: {
      branchId?: string;
      clientId?: string;
      supplierId?: string;
      beneficiaryName?: string;
      referenceType?: string;
      referenceId?: string;
      concept: string;
      total: number;
      dueDate?: string;
    },
  ) {
    return this.financeService.create(user, KINDS[kind], dto);
  }

  @Post(':kind/:id/payments')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  pay(
    @CurrentUser() user: UserPayload,
    @Param('kind') kind: keyof typeof KINDS,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { amount: number; method?: string; notes?: string },
  ) {
    return this.financeService.registerPayment(user, KINDS[kind], id, dto);
  }

  @Post(':kind/:id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('kind') kind: keyof typeof KINDS,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.financeService.cancel(user, KINDS[kind], id);
  }
}
