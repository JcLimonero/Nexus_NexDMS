import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { PartCategory } from '../part-categories/entities/part-category.entity';
import { UnitAccessory } from '../unit-accessories/entities/unit-accessory.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { MechanicChecklistItem } from '../mechanic-checklist/entities/mechanic-checklist-item.entity';
import { MasterCatalogsController } from './master-catalogs.controller';
import { MasterCatalogsService } from './master-catalogs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceType,
      PartCategory,
      UnitAccessory,
      UnitLocation,
      MechanicChecklistItem,
    ]),
  ],
  controllers: [MasterCatalogsController],
  providers: [MasterCatalogsService],
  exports: [MasterCatalogsService],
})
export class MasterCatalogsModule {}
