import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchPrintersController } from './branch-printers.controller';
import { BranchPrintersService } from './branch-printers.service';
import { BranchPrinter } from './entities/branch-printer.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([BranchPrinter, Branch]), BranchesModule],
  controllers: [BranchPrintersController],
  providers: [BranchPrintersService],
  exports: [BranchPrintersService],
})
export class BranchPrintersModule {}
