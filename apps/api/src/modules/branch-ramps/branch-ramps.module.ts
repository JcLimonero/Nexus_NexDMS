import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchRamp } from './entities/branch-ramp.entity';
import { BranchRampsService } from './branch-ramps.service';
import { BranchRampsController } from './branch-ramps.controller';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([BranchRamp]), BranchesModule],
  controllers: [BranchRampsController],
  providers: [BranchRampsService],
  exports: [BranchRampsService],
})
export class BranchRampsModule {}
