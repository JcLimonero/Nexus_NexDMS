import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DeliveryKindEnum {
  /** Entrega de una unidad vendida. */
  UNIT_SALE = 'UNIT_SALE',
  /** Entrega de un vehículo del taller. */
  SERVICE = 'SERVICE',
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

@Entity('deliveries')
@Index(['tenantId', 'kind'])
@Index(['branchId'])
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'folio', type: 'varchar', length: 30 })
  folio: string;

  @Column({ name: 'kind', type: 'varchar', length: 20 })
  kind: DeliveryKindEnum;

  @Column({ name: 'reference_type', type: 'varchar', length: 40, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  /** Texto de referencia (folio de la venta / orden), para lectura rápida. */
  @Column({ name: 'reference_label', type: 'varchar', length: 120, nullable: true })
  referenceLabel: string | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'checklist', type: 'jsonb', default: () => "'[]'" })
  checklist: ChecklistItem[];

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ name: 'signature_key', type: 'varchar', length: 500, nullable: true })
  signatureKey: string | null;

  @Column({ name: 'delivered_by', type: 'uuid', nullable: true })
  deliveredBy: string | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
