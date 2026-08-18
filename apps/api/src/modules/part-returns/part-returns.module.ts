import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartReturn } from './entities/part-return.entity';
import { PartReturnItem } from './entities/part-return-item.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { PartReturnsController } from './part-returns.controller';
import { PartReturnsService } from './part-returns.service';
import { CfdiModule } from '../cfdi/cfdi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartReturn, PartReturnItem, Part, StockMovement]),
    CfdiModule,
  ],
  controllers: [PartReturnsController],
  providers: [PartReturnsService],
  exports: [TypeOrmModule, PartReturnsService],
})
export class PartReturnsModule {}
