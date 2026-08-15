import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockCountLine } from './stock-count-line.entity';

export enum StockCountStatusEnum {
  /** Capturando el conteo; aún no afecta existencias. */
  OPEN = 'OPEN',
  /** Aplicado: se generaron los ajustes y se actualizó el stock. */
  APPLIED = 'APPLIED',
  CANCELLED = 'CANCELLED',
}

/**
 * Conteo físico (toma de inventario) de una sucursal. Congela las existencias
 * del sistema al abrirse y, al aplicarse, reconcilia contra lo contado mediante
 * ajustes de entrada/salida.
 */
@Entity('stock_counts')
@Index(['tenantId'])
@Index(['branchId'])
export class StockCount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'folio', type: 'varchar', length: 30 })
  folio: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: StockCountStatusEnum.OPEN,
  })
  status: StockCountStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @Column({ name: 'applied_by_id', type: 'uuid', nullable: true })
  appliedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @OneToMany(() => StockCountLine, (l) => l.count)
  lines?: StockCountLine[];
}
