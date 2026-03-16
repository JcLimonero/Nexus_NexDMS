import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UnitSale } from '../../unit-sales/entities/unit-sale.entity';
import { UnitAccessory } from './unit-accessory.entity';

@Entity('unit_sale_accessories')
@Index(['unitSaleId'])
@Index(['accessoryId'])
export class UnitSaleAccessory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unit_sale_id', type: 'uuid' })
  unitSaleId: string;

  @Column({ name: 'accessory_id', type: 'uuid' })
  accessoryId: string;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UnitSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;

  @ManyToOne(() => UnitAccessory, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'accessory_id' })
  accessory?: UnitAccessory;
}
