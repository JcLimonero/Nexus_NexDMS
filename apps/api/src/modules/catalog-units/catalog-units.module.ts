import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogUnitsController } from './catalog-units.controller';
import { CatalogUnitsService } from './catalog-units.service';
import { CatalogUnit } from './entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogUnit, Branch, UnitLocation])],
  controllers: [CatalogUnitsController],
  providers: [CatalogUnitsService],
  exports: [CatalogUnitsService],
})
export class CatalogUnitsModule {}
