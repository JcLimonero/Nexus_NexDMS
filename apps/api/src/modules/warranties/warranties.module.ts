import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';
import { Warranty } from './entities/warranty.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warranty, Branch])],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
  exports: [WarrantiesService],
})
export class WarrantiesModule {}
