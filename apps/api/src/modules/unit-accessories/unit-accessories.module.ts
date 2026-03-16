import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitAccessory } from './entities/unit-accessory.entity';
import { UnitAccessoryCompatibility } from './entities/unit-accessory-compatibility.entity';
import { UnitSaleAccessory } from './entities/unit-sale-accessory.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { UnitAccessoriesService } from './unit-accessories.service';
import { UnitAccessoriesController } from './unit-accessories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitAccessory,
      UnitAccessoryCompatibility,
      UnitSaleAccessory,
      CatalogUnit,
    ]),
  ],
  controllers: [UnitAccessoriesController],
  providers: [UnitAccessoriesService],
  exports: [UnitAccessoriesService],
})
export class UnitAccessoriesModule {}
