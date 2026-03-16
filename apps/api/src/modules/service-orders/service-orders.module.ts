import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrder } from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { ServiceOrderFolioSeq } from './entities/service-order-folio-seq.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CfdiModule } from '../cfdi/cfdi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ReceptionChecklist,
      ServiceOrderPart,
      ServiceOrderTime,
      ServiceOrderFolioSeq,
      Branch,
      Part,
      StockMovement,
    ]),
    CfdiModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
