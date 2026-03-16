import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PriceListTypeEnum {
  PUBLIC = 'PUBLIC',
  WHOLESALE = 'WHOLESALE',
  BUSINESS = 'BUSINESS',
}

@Entity('price_lists')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['branchId', 'name'], { unique: true })
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'type', type: 'enum', enum: PriceListTypeEnum })
  type: PriceListTypeEnum;

  @Column({
    name: 'discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPct: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
