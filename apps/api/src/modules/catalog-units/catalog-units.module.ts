import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogUnitsController } from './catalog-units.controller';
import { CatalogUnitsService } from './catalog-units.service';
import { CatalogUnit } from './entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CatalogUnit, Branch, UnitLocation]),
    BranchesModule,
  ],
  controllers: [CatalogUnitsController],
  providers: [CatalogUnitsService],
  exports: [CatalogUnitsService],
})
export class CatalogUnitsModule {}
