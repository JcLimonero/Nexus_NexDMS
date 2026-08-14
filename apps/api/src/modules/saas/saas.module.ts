import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SaasController } from './saas.controller';
import { SaasService } from './saas.service';
import {
  SaasModulePrice,
  SaasPayment,
  SaasPlan,
} from './entities/saas.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaasPlan, SaasModulePrice, SaasPayment, Tenant]),
  ],
  controllers: [SaasController],
  providers: [SaasService],
  exports: [SaasService],
})
export class SaasModule {}
