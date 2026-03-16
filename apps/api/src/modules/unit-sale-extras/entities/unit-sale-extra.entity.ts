import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UnitSale } from '../../unit-sales/entities/unit-sale.entity';

export enum UnitSaleExtraTypeEnum {
  INSURANCE = 'INSURANCE',
  PLATE_PROCESSING = 'PLATE_PROCESSING',
}

export enum UnitSaleExtraStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('unit_sale_extras')
@Index(['unitSaleId'])
@Index(['type'])
export class UnitSaleExtra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unit_sale_id', type: 'uuid' })
  unitSaleId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: UnitSaleExtraTypeEnum,
    enumName: 'unit_sale_extras_type_enum',
  })
  type: UnitSaleExtraTypeEnum;

  @Column({
    name: 'provider_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  providerName: string | null;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  providerReference: string | null;

  @Column({ name: 'cost', type: 'decimal', precision: 12, scale: 2 })
  cost: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: UnitSaleExtraStatusEnum,
    enumName: 'unit_sale_extras_status_enum',
    default: UnitSaleExtraStatusEnum.PENDING,
  })
  status: UnitSaleExtraStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'extra_data', type: 'jsonb', nullable: true })
  extraData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UnitSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;
}
