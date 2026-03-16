import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLocation } from './entities/stock-location.entity';
import { StockLocationsController } from './stock-locations.controller';
import { StockLocationsService } from './stock-locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockLocation])],
  controllers: [StockLocationsController],
  providers: [StockLocationsService],
  exports: [TypeOrmModule, StockLocationsService],
})
export class StockLocationsModule {}
