import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleType } from './entities/vehicle-type.entity';
import { VehicleTypesController } from './vehicle-types.controller';
import { VehicleTypesService } from './vehicle-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleType])],
  controllers: [VehicleTypesController],
  providers: [VehicleTypesService],
  exports: [VehicleTypesService],
})
export class VehicleTypesModule {}
