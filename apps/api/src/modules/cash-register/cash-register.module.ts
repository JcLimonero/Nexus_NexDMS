import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CortePdfService } from './corte-pdf.service';
import { CashSession } from './entities/cash-session.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, CashMovement, Branch])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService, CortePdfService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
