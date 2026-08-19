import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleModel } from './entities/vehicle-model.entity';
import { VehicleModelsController } from './vehicle-models.controller';
import { VehicleModelsService } from './vehicle-models.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleModel])],
  controllers: [VehicleModelsController],
  providers: [VehicleModelsService],
  exports: [VehicleModelsService],
})
export class VehicleModelsModule {}
