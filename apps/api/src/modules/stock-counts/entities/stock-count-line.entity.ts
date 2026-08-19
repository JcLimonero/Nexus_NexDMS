import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockCount } from './stock-count.entity';

/**
 * Renglón de un conteo físico: una parte, lo que dice el sistema y lo contado.
 * `difference` = contado − sistema (positivo sobra, negativo falta).
 */
@Entity('stock_count_lines')
@Index(['countId'])
@Index(['partId'])
export class StockCountLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'count_id', type: 'uuid' })
  countId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'sku', type: 'varchar', length: 100 })
  sku: string;

  @Column({ name: 'name', type: 'varchar', length: 300 })
  name: string;

  @Column({ name: 'system_qty', type: 'int' })
  systemQty: number;

  @Column({ name: 'counted_qty', type: 'int', nullable: true })
  countedQty: number | null;

  @Column({ name: 'difference', type: 'int', nullable: true })
  difference: number | null;

  @ManyToOne(() => StockCount, (c) => c.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'count_id' })
  count?: StockCount;
}
