import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitSaleExtra } from './entities/unit-sale-extra.entity';
import { UnitSaleExtrasService } from './unit-sale-extras.service';
import { UnitSaleExtrasController } from './unit-sale-extras.controller';
import { UnitSalesModule } from '../unit-sales/unit-sales.module';

@Module({
  imports: [TypeOrmModule.forFeature([UnitSaleExtra]), UnitSalesModule],
  controllers: [UnitSaleExtrasController],
  providers: [UnitSaleExtrasService],
  exports: [UnitSaleExtrasService],
})
export class UnitSaleExtrasModule {}
