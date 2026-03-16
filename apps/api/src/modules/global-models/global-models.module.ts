import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalModelsController } from './global-models.controller';
import { GlobalModelsService } from './global-models.service';
import { GlobalModel } from './entities/global-model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalModel])],
  controllers: [GlobalModelsController],
  providers: [GlobalModelsService],
  exports: [GlobalModelsService],
})
export class GlobalModelsModule {}
