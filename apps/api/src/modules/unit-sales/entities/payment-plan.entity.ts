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
import { UnitSale } from './unit-sale.entity';
import { PaymentPlanInstallment } from './payment-plan-installment.entity';

export enum PaymentPlanStatusEnum {
  ACTIVE = 'ACTIVE',
  PAID_OFF = 'PAID_OFF',
  OVERDUE = 'OVERDUE',
}

@Entity('payment_plans')
@Index(['unitSaleId'])
@Index(['status'])
export class PaymentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unit_sale_id', type: 'uuid' })
  unitSaleId: string;

  @Column({ name: 'installment_count', type: 'int' })
  installmentCount: number;

  @Column({ name: 'monthly_amount', type: 'decimal', precision: 12, scale: 2 })
  monthlyAmount: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2 })
  interestRate: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'first_payment_date', type: 'date' })
  firstPaymentDate: Date;

  @Column({ name: 'status', type: 'enum', enum: PaymentPlanStatusEnum })
  status: PaymentPlanStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UnitSale, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;

  @OneToMany(() => PaymentPlanInstallment, (i) => i.paymentPlan)
  installments?: PaymentPlanInstallment[];
}
