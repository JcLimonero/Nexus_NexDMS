import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { ComprobanteEntregaPdfService } from './comprobante-entrega-pdf.service';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Delivery,
      Branch,
      LegalEntity,
      Tenant,
      Client,
      User,
    ]),
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, ComprobanteEntregaPdfService],
  exports: [TypeOrmModule, DeliveriesService],
})
export class DeliveriesModule {}
