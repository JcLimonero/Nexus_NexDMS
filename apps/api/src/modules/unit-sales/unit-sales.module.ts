import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitSalesController } from './unit-sales.controller';
import { UnitSalesService } from './unit-sales.service';
import { UnitSale } from './entities/unit-sale.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { PaymentPlanInstallment } from './entities/payment-plan-installment.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import { UnitReservation } from '../unit-reservations/entities/unit-reservation.entity';
import { CfdiModule } from '../cfdi/cfdi.module';
import { UnitAccessoriesModule } from '../unit-accessories/unit-accessories.module';
import { UnitSaleAccessory } from '../unit-accessories/entities/unit-sale-accessory.entity';
import { UnitSaleExtra } from '../unit-sale-extras/entities/unit-sale-extra.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitSale,
      PaymentPlan,
      PaymentPlanInstallment,
      CatalogUnit,
      Client,
      UnitReservation,
      UnitSaleAccessory,
      UnitSaleExtra,
    ]),
    CfdiModule,
    UnitAccessoriesModule,
  ],
  controllers: [UnitSalesController],
  providers: [UnitSalesService],
  exports: [UnitSalesService],
})
export class UnitSalesModule {}
