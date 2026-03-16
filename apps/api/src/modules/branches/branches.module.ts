import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { BranchConfig } from './entities/branch-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchConfig]),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class BranchesModule {}
