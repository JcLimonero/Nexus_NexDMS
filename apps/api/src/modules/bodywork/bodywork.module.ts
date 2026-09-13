import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import { ModulesModule } from '../modules/modules.module';
import { BodyworkController } from './bodywork.controller';
import { BodyworkService } from './bodywork.service';
import { BodyworkPdfService } from './bodywork-pdf.service';
import { BodyworkOrder } from './entities/bodywork-order.entity';
import { BodyworkItem } from './entities/bodywork-item.entity';
import { BodyworkPhoto } from './entities/bodywork-photo.entity';
import { BodyworkPart } from './entities/bodywork-part.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BodyworkOrder,
      BodyworkItem,
      BodyworkPhoto,
      BodyworkPart,
      Branch,
      LegalEntity,
      Tenant,
    ]),
    StorageModule,
    ModulesModule,
  ],
  controllers: [BodyworkController],
  providers: [BodyworkService, BodyworkPdfService],
  exports: [BodyworkService],
})
export class BodyworkModule {}
