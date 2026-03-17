import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitReturn } from './entities/unit-return.entity';
import { UnitReturnsController } from './unit-returns.controller';
import { UnitReturnsService } from './unit-returns.service';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnitReturn, CatalogUnit]),
    BranchesModule,
  ],
  controllers: [UnitReturnsController],
  providers: [UnitReturnsService],
  exports: [UnitReturnsService],
})
export class UnitReturnsModule {}
