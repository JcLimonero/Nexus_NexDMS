import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ReciboVentaPdfService } from './recibo-venta-pdf.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { SaleTicketSequence } from './entities/sale-ticket-sequence.entity';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CfdiModule } from '../cfdi/cfdi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      SalePayment,
      SaleTicketSequence,
      CashSession,
      Branch,
      Part,
      StockMovement,
      LegalEntity,
      Tenant,
    ]),
    CfdiModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, ReciboVentaPdfService],
  exports: [SalesService],
})
export class SalesModule {}
