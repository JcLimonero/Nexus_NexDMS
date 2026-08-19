import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum StockMovementTypeEnum {
  PURCHASE_IN = 'PURCHASE_IN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  SALE_OUT = 'SALE_OUT',
  SERVICE_OUT = 'SERVICE_OUT',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
}

@Entity('stock_movements')
@Index(['tenantId'])
@Index(['partId'])
@Index(['branchId'])
@Index(['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'movement_type', type: 'enum', enum: StockMovementTypeEnum })
  movementType: StockMovementTypeEnum;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'stock_before', type: 'int' })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'int' })
  stockAfter: number;

  /** Costo unitario de la entrada (solo en compras), para rastrear el costeo. */
  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCost: number | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
