import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { BranchConfig } from './entities/branch-config.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, BranchConfig]), SharedModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [TypeOrmModule, BranchesService],
})
export class BranchesModule {}
