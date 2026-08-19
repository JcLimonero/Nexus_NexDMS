import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogUnitsController } from './catalog-units.controller';
import { CatalogUnitsService } from './catalog-units.service';
import { CatalogUnit } from './entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { UnitReturn } from '../unit-returns/entities/unit-return.entity';
import { UnitReturnDocument } from '../unit-return-documents/entities/unit-return-document.entity';
import { GlobalModel } from '../global-models/entities/global-model.entity';
import { VehicleColor } from '../vehicle-colors/entities/vehicle-color.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CatalogUnit,
      Branch,
      UnitLocation,
      UnitSale,
      UnitReturn,
      UnitReturnDocument,
      GlobalModel,
      VehicleColor,
    ]),
    BranchesModule,
  ],
  controllers: [CatalogUnitsController],
  providers: [CatalogUnitsService],
  exports: [CatalogUnitsService],
})
export class CatalogUnitsModule {}
