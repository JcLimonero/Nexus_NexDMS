import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentPlan } from './payment-plan.entity';

export enum PaymentPlanInstallmentStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

@Entity('payment_plan_installments')
@Index(['paymentPlanId'])
@Index(['dueDate'])
@Index(['status'])
export class PaymentPlanInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_plan_id', type: 'uuid' })
  paymentPlanId: string;

  @Column({ name: 'installment_number', type: 'int' })
  installmentNumber: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: Date | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentPlanInstallmentStatusEnum,
  })
  status: PaymentPlanInstallmentStatusEnum;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentMethod: string | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  paymentReference: string | null;

  @Column({ name: 'cfdi_uuid', type: 'varchar', length: 100, nullable: true })
  cfdiUuid: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PaymentPlan, (p) => p.installments, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'payment_plan_id' })
  paymentPlan?: PaymentPlan;
}
