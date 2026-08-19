import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleVersion } from './entities/vehicle-version.entity';
import { VehicleModel } from '../vehicle-models/entities/vehicle-model.entity';
import { VehicleVersionsController } from './vehicle-versions.controller';
import { VehicleVersionsService } from './vehicle-versions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleVersion, VehicleModel]),
  ],
  controllers: [VehicleVersionsController],
  providers: [VehicleVersionsService],
  exports: [VehicleVersionsService],
})
export class VehicleVersionsModule {}
