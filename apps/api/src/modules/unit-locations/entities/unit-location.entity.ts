import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UnitLocationZoneEnum {
  LOT = 'LOT',
  EXHIBITION = 'EXHIBITION',
  WAREHOUSE = 'WAREHOUSE',
}

@Entity('unit_locations')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['branchId', 'code'], { unique: true })
export class UnitLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'zone', type: 'enum', enum: UnitLocationZoneEnum })
  zone: UnitLocationZoneEnum;

  @Column({ name: 'space', type: 'varchar', length: 20 })
  space: string;

  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
