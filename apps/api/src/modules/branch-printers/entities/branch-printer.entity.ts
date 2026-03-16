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
import { Branch } from '../../branches/entities/branch.entity';

export enum BranchPrinterTypeEnum {
  THERMAL_80MM = 'THERMAL_80MM',
  LASER = 'LASER',
  INKJET = 'INKJET',
}

export enum BranchPrinterUsageEnum {
  TICKETS = 'TICKETS',
  DOCUMENTS = 'DOCUMENTS',
  BOTH = 'BOTH',
}

@Entity('branch_printers')
@Index(['tenantId'])
@Index(['branchId'])
export class BranchPrinter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'type', type: 'enum', enum: BranchPrinterTypeEnum })
  type: BranchPrinterTypeEnum;

  @Column({ name: 'usage', type: 'enum', enum: BranchPrinterUsageEnum })
  usage: BranchPrinterUsageEnum;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;
}
