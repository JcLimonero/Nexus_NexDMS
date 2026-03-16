import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitLocationsController } from './unit-locations.controller';
import { UnitLocationsService } from './unit-locations.service';
import { UnitLocation } from './entities/unit-location.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([UnitLocation, Branch]), BranchesModule],
  controllers: [UnitLocationsController],
  providers: [UnitLocationsService],
  exports: [UnitLocationsService],
})
export class UnitLocationsModule {}
