import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockCount } from './entities/stock-count.entity';
import { StockCountLine } from './entities/stock-count-line.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';
import { BranchesModule } from '../branches/branches.module';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockCount, StockCountLine, Part, StockMovement]),
    BranchesModule,
    ModulesModule,
  ],
  controllers: [StockCountsController],
  providers: [StockCountsService],
  exports: [TypeOrmModule],
})
export class StockCountsModule {}
