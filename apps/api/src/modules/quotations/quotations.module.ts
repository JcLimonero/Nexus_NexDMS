import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationFolioSeq } from './entities/quotation-folio-seq.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      QuotationItem,
      QuotationFolioSeq,
      Branch,
      Part,
      CatalogUnit,
    ]),
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
