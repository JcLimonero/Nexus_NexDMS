import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './entities/part.entity';
import { PartEquivalence } from './entities/part-equivalence.entity';
import { PartCategory } from '../part-categories/entities/part-category.entity';
import { StockLocation } from '../stock-locations/entities/stock-location.entity';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Part,
      PartEquivalence,
      PartCategory,
      StockLocation,
    ]),
    BranchesModule,
  ],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [TypeOrmModule, PartsService],
})
export class PartsModule {}
