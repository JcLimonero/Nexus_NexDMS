import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Part } from '../../parts/entities/part.entity';
import { WarehouseTransfer } from './warehouse-transfer.entity';

@Entity('warehouse_transfer_items')
@Index(['warehouseTransferId'])
@Index(['partId'])
export class WarehouseTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_transfer_id', type: 'uuid' })
  warehouseTransferId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @ManyToOne(() => WarehouseTransfer, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_transfer_id' })
  warehouseTransfer?: WarehouseTransfer;

  @ManyToOne(() => Part, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;
}
