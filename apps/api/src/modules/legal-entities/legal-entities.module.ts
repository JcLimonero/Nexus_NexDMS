import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalEntity } from './entities/legal-entity.entity';
import { LegalEntitiesController } from './legal-entities.controller';
import { LegalEntitiesService } from './legal-entities.service';

@Module({
  imports: [TypeOrmModule.forFeature([LegalEntity])],
  controllers: [LegalEntitiesController],
  providers: [LegalEntitiesService],
  exports: [TypeOrmModule, LegalEntitiesService],
})
export class LegalEntitiesModule {}
