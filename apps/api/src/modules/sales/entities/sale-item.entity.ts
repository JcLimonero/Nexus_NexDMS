import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Part } from '../../parts/entities/part.entity';
import { Sale } from './sale.entity';

@Entity('sale_items')
@Index(['saleId'])
@Index(['partId'])
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({
    name: 'discount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Sale, (s) => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;

  @ManyToOne(() => Part, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;
}
