import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombustionType } from './entities/combustion-type.entity';
import { CombustionTypesController } from './combustion-types.controller';
import { CombustionTypesService } from './combustion-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([CombustionType])],
  controllers: [CombustionTypesController],
  providers: [CombustionTypesService],
  exports: [CombustionTypesService],
})
export class CombustionTypesModule {}
