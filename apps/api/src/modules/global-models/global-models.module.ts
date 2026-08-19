import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalModelsController } from './global-models.controller';
import { GlobalModelsService } from './global-models.service';
import { GlobalModel } from './entities/global-model.entity';
import { VehicleTypesModule } from '../vehicle-types/vehicle-types.module';
import { GlobalBrandsModule } from '../global-brands/global-brands.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalModel]),
    VehicleTypesModule,
    GlobalBrandsModule,
  ],
  controllers: [GlobalModelsController],
  providers: [GlobalModelsService],
  exports: [GlobalModelsService],
})
export class GlobalModelsModule {}
