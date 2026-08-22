import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SaasController } from './saas.controller';
import { MiCobroController } from './mi-cobro.controller';
import { SaasWebhookController } from './saas-webhook.controller';
import { SaasService } from './saas.service';
import { BillingStatusService } from './billing-status.service';
import { ConektaService } from './conekta.service';
import {
  SaasModulePrice,
  SaasPayment,
  SaasPlan,
} from './entities/saas.entities';
import { StorageModule } from '../../common/storage/storage.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaasPlan, SaasModulePrice, SaasPayment, Tenant]),
    StorageModule,
    EmailModule,
  ],
  controllers: [SaasController, MiCobroController, SaasWebhookController],
  providers: [SaasService, BillingStatusService, ConektaService],
  exports: [SaasService, BillingStatusService],
})
export class SaasModule {}
