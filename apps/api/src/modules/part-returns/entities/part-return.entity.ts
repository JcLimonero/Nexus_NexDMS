import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartReturnItem } from './part-return-item.entity';

export enum ReturnKindEnum {
  /** El cliente devuelve/reclama una pieza que le vendí. */
  CLIENT_RETURN = 'CLIENT_RETURN',
  /** Reclamo al proveedor una pieza defectuosa que le compré. */
  SUPPLIER_CLAIM = 'SUPPLIER_CLAIM',
}

export enum RefundMethodEnum {
  CASH = 'CASH',
  CREDIT_NOTE = 'CREDIT_NOTE',
  REPLACEMENT = 'REPLACEMENT',
  NONE = 'NONE',
}

@Entity('part_returns')
@Index(['tenantId'])
@Index(['branchId'])
export class PartReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'folio', type: 'varchar', length: 30 })
  folio: string;

  @Column({ name: 'kind', type: 'varchar', length: 20 })
  kind: ReturnKindEnum;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null;

  /** La devolución/reclamo es por garantía. */
  @Column({ name: 'is_warranty', type: 'boolean', default: false })
  isWarranty: boolean;

  /** Si el movimiento toca el stock vendible (reingreso o salida). */
  @Column({ name: 'restock', type: 'boolean', default: true })
  restock: boolean;

  @Column({ name: 'reason', type: 'varchar', length: 400, nullable: true })
  reason: string | null;

  @Column({
    name: 'refund_method',
    type: 'varchar',
    length: 20,
    default: RefundMethodEnum.NONE,
  })
  refundMethod: RefundMethodEnum;

  @Column({
    name: 'refund_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refundTotal: number;

  /** CFDI de la venta original (para relacionar la nota de crédito). */
  @Column({ name: 'cfdi_id', type: 'uuid', nullable: true })
  cfdiId: string | null;

  /** CFDI de la nota de crédito emitida por esta devolución. */
  @Column({ name: 'nota_credito_cfdi_id', type: 'uuid', nullable: true })
  notaCreditoCfdiId: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => PartReturnItem, (i) => i.partReturn)
  items?: PartReturnItem[];
}
