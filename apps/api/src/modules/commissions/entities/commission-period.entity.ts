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
import { CommissionDetail } from './commission-detail.entity';

export enum CommissionPeriodTypeEnum {
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum CommissionPeriodStatusEnum {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

@Entity('commission_periods')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['periodDate'])
export class CommissionPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'period_date', type: 'date' })
  periodDate: Date;

  @Column({ name: 'type', type: 'enum', enum: CommissionPeriodTypeEnum })
  type: CommissionPeriodTypeEnum;

  @Column({ name: 'status', type: 'enum', enum: CommissionPeriodStatusEnum })
  status: CommissionPeriodStatusEnum;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @OneToMany(() => CommissionDetail, (d) => d.period)
  details?: CommissionDetail[];
}
