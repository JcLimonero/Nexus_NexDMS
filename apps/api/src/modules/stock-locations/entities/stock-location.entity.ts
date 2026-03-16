import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stock_locations')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['branchId', 'code'], { unique: true })
export class StockLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'zone', type: 'varchar', length: 10 })
  zone: string;

  @Column({ name: 'aisle', type: 'varchar', length: 10, nullable: true })
  aisle: string | null;

  @Column({ name: 'shelf', type: 'varchar', length: 10, nullable: true })
  shelf: string | null;

  @Column({ name: 'level', type: 'varchar', length: 10, nullable: true })
  level: string | null;

  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
