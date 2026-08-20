import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Part } from '../../parts/entities/part.entity';

@Entity('purchase_order_items')
@Index(['purchaseOrderId'])
@Index(['partId'])
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'quantity_received', type: 'int', default: 0 })
  quantityReceived: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  /** Garantía del proveedor capturada al comprar; al recibir se copia a
   * part_suppliers para verla en el detalle de la refacción. */
  @Column({ name: 'warranty_months', type: 'int', nullable: true })
  warrantyMonths: number | null;

  @Column({ name: 'warranty_note', type: 'varchar', length: 300, nullable: true })
  warrantyNote: string | null;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;
}
