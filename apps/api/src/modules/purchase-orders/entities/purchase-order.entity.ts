import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatusEnum {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['supplierId'])
@Index(['folio'])
@Index(['status'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'folio', type: 'varchar', length: 50 })
  folio: string;

  @Column({ name: 'status', type: 'enum', enum: PurchaseOrderStatusEnum })
  status: PurchaseOrderStatusEnum;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2 })
  taxAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({
    name: 'supplier_invoice_uuid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  supplierInvoiceUuid: string | null;

  @Column({ name: 'ordered_at', type: 'date' })
  orderedAt: Date;

  @Column({ name: 'expected_at', type: 'date', nullable: true })
  expectedAt: Date | null;

  @Column({ name: 'received_at', type: 'date', nullable: true })
  receivedAt: Date | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder)
  items: PurchaseOrderItem[];
}
