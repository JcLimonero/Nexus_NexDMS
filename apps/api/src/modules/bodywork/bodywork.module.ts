import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import { ModulesModule } from '../modules/modules.module';
import { BodyworkController } from './bodywork.controller';
import { BodyworkService } from './bodywork.service';
import { BodyworkOrder } from './entities/bodywork-order.entity';
import { BodyworkItem } from './entities/bodywork-item.entity';
import { BodyworkPhoto } from './entities/bodywork-photo.entity';
import { BodyworkPart } from './entities/bodywork-part.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BodyworkOrder,
      BodyworkItem,
      BodyworkPhoto,
      BodyworkPart,
    ]),
    StorageModule,
    ModulesModule,
  ],
  controllers: [BodyworkController],
  providers: [BodyworkService],
  exports: [BodyworkService],
})
export class BodyworkModule {}
