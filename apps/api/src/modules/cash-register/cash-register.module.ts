import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashSession } from './entities/cash-session.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, Branch])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
