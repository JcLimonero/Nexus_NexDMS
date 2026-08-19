import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SaleDocument,
  SaleDocumentRule,
  SaleDocumentType,
} from './entities/sale-document.entities';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { ClientDocument } from '../documents/entities/client-document.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { SaleDocumentsService } from './sale-documents.service';
import { SaleDocumentsController } from './sale-documents.controller';
import { StorageModule } from '../../common/storage/storage.module';
import { ModulesModule } from '../modules/modules.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleDocumentType,
      SaleDocumentRule,
      SaleDocument,
      UnitSale,
      Client,
      ClientDocument,
      CatalogUnit,
    ]),
    StorageModule,
    ModulesModule,
    AuthModule,
  ],
  controllers: [SaleDocumentsController],
  providers: [SaleDocumentsService],
  exports: [SaleDocumentsService],
})
export class SaleDocumentsModule {}
