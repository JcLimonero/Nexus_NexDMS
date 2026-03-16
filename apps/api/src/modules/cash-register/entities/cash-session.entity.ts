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
import { User } from '../../users/entities/user.entity';

export enum CashSessionStatusEnum {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('cash_sessions')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['openedAt'])
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 12, scale: 2 })
  openingBalance: number;

  @Column({
    name: 'closing_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  closingBalance: number | null;

  @Column({
    name: 'total_cash',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalCash: number;

  @Column({
    name: 'total_card',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalCard: number;

  @Column({
    name: 'total_transfer',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalTransfer: number;

  @Column({
    name: 'total_sales',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalSales: number;

  @Column({
    name: 'difference',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  difference: number | null;

  @Column({ name: 'opened_at', type: 'timestamp' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'status', type: 'enum', enum: CashSessionStatusEnum })
  status: CashSessionStatusEnum;

  @Column({ name: 'closing_notes', type: 'text', nullable: true })
  closingNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
