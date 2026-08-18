import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartReturn } from './part-return.entity';

export enum ReturnItemConditionEnum {
  GOOD = 'GOOD',
  DEFECTIVE = 'DEFECTIVE',
}

@Entity('part_return_items')
@Index(['returnId'])
export class PartReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'return_id', type: 'uuid' })
  returnId: string;

  @ManyToOne(() => PartReturn, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_id' })
  partReturn?: PartReturn;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    name: 'condition',
    type: 'varchar',
    length: 12,
    default: ReturnItemConditionEnum.GOOD,
  })
  condition: ReturnItemConditionEnum;
}
