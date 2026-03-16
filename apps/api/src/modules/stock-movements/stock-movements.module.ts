import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, Part])],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [TypeOrmModule, StockMovementsService],
})
export class StockMovementsModule {}
