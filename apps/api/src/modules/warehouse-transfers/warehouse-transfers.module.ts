import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseTransfersController } from './warehouse-transfers.controller';
import { WarehouseTransfersService } from './warehouse-transfers.service';
import { WarehouseTransfer } from './entities/warehouse-transfer.entity';
import { WarehouseTransferItem } from './entities/warehouse-transfer-item.entity';
import { TransferFolioSequence } from './entities/transfer-folio-sequence.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseTransfer,
      WarehouseTransferItem,
      TransferFolioSequence,
      Branch,
      Part,
      StockMovement,
    ]),
  ],
  controllers: [WarehouseTransfersController],
  providers: [WarehouseTransfersService],
  exports: [WarehouseTransfersService],
})
export class WarehouseTransfersModule {}
