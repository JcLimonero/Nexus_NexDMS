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
import { User } from '../../users/entities/user.entity';
import { CommissionPeriod } from './commission-period.entity';

export enum CommissionDetailStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('commission_details')
@Index(['periodId'])
@Index(['userId'])
export class CommissionDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50 })
  referenceType: string;

  @Column({ name: 'concept', type: 'text' })
  concept: string;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2 })
  baseAmount: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'status', type: 'enum', enum: CommissionDetailStatusEnum })
  status: CommissionDetailStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CommissionPeriod, (p) => p.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period?: CommissionPeriod;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
