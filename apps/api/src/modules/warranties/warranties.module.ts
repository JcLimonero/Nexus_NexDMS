import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';
import { CartaGarantiaPdfService } from './carta-garantia-pdf.service';
import { Warranty } from './entities/warranty.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { BranchesModule } from '../branches/branches.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warranty, Branch, Client, LegalEntity, Tenant]),
    BranchesModule,
    EmailModule,
  ],
  controllers: [WarrantiesController],
  providers: [WarrantiesService, CartaGarantiaPdfService],
  exports: [WarrantiesService],
})
export class WarrantiesModule {}
