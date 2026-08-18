import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { Client } from '../clients/entities/client.entity';
import { Part } from '../parts/entities/part.entity';
import { PriceListsController } from './price-lists.controller';
import { PriceListsService } from './price-lists.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList, PriceListItem, Client, Part])],
  controllers: [PriceListsController],
  providers: [PriceListsService, PricingService],
  exports: [TypeOrmModule, PriceListsService, PricingService],
})
export class PriceListsModule {}
