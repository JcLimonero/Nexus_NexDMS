import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitReturnDocument } from './entities/unit-return-document.entity';
import { UnitReturn } from '../unit-returns/entities/unit-return.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { UnitReturnDocumentsController } from './unit-return-documents.controller';
import { DocumentTypesController } from './document-types.controller';
import { UnitReturnDocumentsService } from './unit-return-documents.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnitReturnDocument, UnitReturn, CatalogUnit]),
    BranchesModule,
  ],
  controllers: [UnitReturnDocumentsController, DocumentTypesController],
  providers: [UnitReturnDocumentsService],
  exports: [UnitReturnDocumentsService],
})
export class UnitReturnDocumentsModule {}
