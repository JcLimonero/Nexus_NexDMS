import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CfdiLog } from '../cfdi-log/entities/cfdi-log.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { Sale } from '../sales/entities/sale.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { CfdiLogModule } from '../cfdi-log/cfdi-log.module';
import { SharedModule } from '../../shared/shared.module';
import { CfdiService } from './cfdi.service';
import { CfdiController } from './cfdi.controller';

@Module({
  imports: [
    CfdiLogModule,
    SharedModule,
    TypeOrmModule.forFeature([
      CfdiLog,
      Branch,
      BranchConfig,
      Sale,
      ServiceOrder,
      UnitSale,
      Client,
    ]),
  ],
  controllers: [CfdiController],
  providers: [CfdiService],
  exports: [CfdiService],
})
export class CfdiModule {}
