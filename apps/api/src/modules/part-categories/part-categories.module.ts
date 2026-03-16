import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartCategory } from './entities/part-category.entity';
import { PartCategoriesController } from './part-categories.controller';
import { PartCategoriesService } from './part-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartCategory])],
  controllers: [PartCategoriesController],
  providers: [PartCategoriesService],
  exports: [TypeOrmModule, PartCategoriesService],
})
export class PartCategoriesModule {}
