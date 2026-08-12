import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import {
  Payable,
  PayablePayment,
  Receivable,
  ReceivablePayment,
} from './entities/finance.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Receivable,
      ReceivablePayment,
      Payable,
      PayablePayment,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
