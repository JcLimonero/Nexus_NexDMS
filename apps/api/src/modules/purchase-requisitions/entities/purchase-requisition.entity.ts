import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RequisitionStatusEnum {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Requisición de compra: una refacción "por pedir". Nace de un trabajo que
 * necesita una parte bajo demanda o sin stock, y se convierte en orden de
 * compra.
 */
@Entity('purchase_requisitions')
@Index(['tenantId', 'status'])
@Index(['branchId'])
export class PurchaseRequisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: RequisitionStatusEnum.PENDING,
  })
  status: RequisitionStatusEnum;

  /** De dónde salió: 'manual', 'quotation', 'service_order'… */
  @Column({ name: 'source_type', type: 'varchar', length: 30, default: 'manual' })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ name: 'note', type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  /** Orden de compra que la surtió (al convertir la requisición). */
  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
