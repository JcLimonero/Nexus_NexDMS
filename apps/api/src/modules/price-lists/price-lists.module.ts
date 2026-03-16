import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListsController } from './price-lists.controller';
import { PriceListsService } from './price-lists.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList])],
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [TypeOrmModule, PriceListsService],
})
export class PriceListsModule {}
