import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchPrintersController } from './branch-printers.controller';
import { BranchPrintersService } from './branch-printers.service';
import { BranchPrinter } from './entities/branch-printer.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchPrinter, Branch])],
  controllers: [BranchPrintersController],
  providers: [BranchPrintersService],
  exports: [BranchPrintersService],
})
export class BranchPrintersModule {}
