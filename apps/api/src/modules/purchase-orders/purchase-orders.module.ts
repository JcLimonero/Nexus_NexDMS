import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolioSequence } from './entities/folio-sequence.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { OrdenCompraPdfService } from './orden-compra-pdf.service';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Part } from '../parts/entities/part.entity';
import { PartSupplier } from '../parts/entities/part-supplier.entity';
import { PartEquivalence } from '../parts/entities/part-equivalence.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      FolioSequence,
      Branch,
      LegalEntity,
      Tenant,
      User,
      Part,
      PartSupplier,
      PartEquivalence,
      StockMovement,
      Supplier,
    ]),
    BranchesModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, OrdenCompraPdfService],
  exports: [TypeOrmModule, PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
