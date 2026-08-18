import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationItemPhoto } from './entities/quotation-item-photo.entity';
import { QuotationFolioSeq } from './entities/quotation-folio-seq.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { PurchaseRequisition } from '../purchase-requisitions/entities/purchase-requisition.entity';
import { BranchesModule } from '../branches/branches.module';
import { UnitSalesModule } from '../unit-sales/unit-sales.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      QuotationItem,
      QuotationItemPhoto,
      QuotationFolioSeq,
      Branch,
      Part,
      CatalogUnit,
      PurchaseRequisition,
    ]),
    BranchesModule,
    UnitSalesModule,
    ServiceOrdersModule,
    PriceListsModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
