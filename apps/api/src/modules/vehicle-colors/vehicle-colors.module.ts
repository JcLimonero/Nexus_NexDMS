import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleColor } from './entities/vehicle-color.entity';
import { VehicleColorsController } from './vehicle-colors.controller';
import { VehicleColorsService } from './vehicle-colors.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleColor])],
  controllers: [VehicleColorsController],
  providers: [VehicleColorsService],
  exports: [VehicleColorsService],
})
export class VehicleColorsModule {}
