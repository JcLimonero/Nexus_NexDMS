import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ModuleDashboardService } from './module-dashboard.service';
import { ModulesModule } from '../modules/modules.module';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import { Sale } from '../sales/entities/sale.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { Payable, Receivable } from '../finance/entities/finance.entities';
import { Lead } from '../leads/leads.module';
import { UsedUnitIntake } from '../used-units/used-units.module';
import { PldOperation } from '../pld/pld.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ServiceSurvey,
      Appointment,
      Part,
      Sale,
      UnitSale,
      Client,
      CatalogUnit,
      PurchaseOrder,
      Quotation,
      Receivable,
      Payable,
      Lead,
      UsedUnitIntake,
      PldOperation,
    ]),
    ModulesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, ModuleDashboardService],
})
export class DashboardModule {}
