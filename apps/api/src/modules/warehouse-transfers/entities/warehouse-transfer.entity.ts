import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { WarehouseTransferItem } from './warehouse-transfer-item.entity';

export enum WarehouseTransferTypeEnum {
  INTRA_BRAND = 'INTRA_BRAND',
  INTER_BRAND = 'INTER_BRAND',
}

export enum WarehouseTransferStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('warehouse_transfers')
@Index(['tenantId'])
@Index(['originBranchId'])
@Index(['destinationBranchId'])
@Index(['folio'])
@Index(['status'])
export class WarehouseTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'origin_branch_id', type: 'uuid' })
  originBranchId: string;

  @Column({ name: 'destination_branch_id', type: 'uuid' })
  destinationBranchId: string;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId: string | null;

  @Column({ name: 'folio', type: 'varchar', length: 50 })
  folio: string;

  @Column({ name: 'type', type: 'enum', enum: WarehouseTransferTypeEnum })
  type: WarehouseTransferTypeEnum;

  @Column({ name: 'status', type: 'enum', enum: WarehouseTransferStatusEnum })
  status: WarehouseTransferStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'origin_branch_id' })
  originBranch?: Branch;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'destination_branch_id' })
  destinationBranch?: Branch;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @OneToMany(() => WarehouseTransferItem, (item) => item.warehouseTransfer)
  items?: WarehouseTransferItem[];
}
