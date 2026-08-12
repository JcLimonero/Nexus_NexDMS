import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

export type FinanceDocStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELLED';

/** Cuenta por cobrar. */
@Entity('receivables')
@Index(['tenantId', 'status'])
export class Receivable {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;
  @Column({ name: 'concept', type: 'varchar', length: 300 }) concept: string;
  @Column({ name: 'total', type: 'numeric', precision: 12, scale: 2 })
  total: string;
  @Column({ name: 'paid_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount: string;
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'OPEN' })
  status: FinanceDocStatus;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}

@Entity('receivable_payments')
export class ReceivablePayment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'receivable_id', type: 'uuid' }) receivableId: string;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: string;
  @Column({ name: 'method', type: 'varchar', length: 30, default: 'CASH' })
  method: string;
  @Column({ name: 'notes', type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

/** Cuenta por pagar (proveedor o particular/beneficiario). */
@Entity('payables')
@Index(['tenantId', 'status'])
export class Payable {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null;
  @Column({ name: 'beneficiary_name', type: 'varchar', length: 300, nullable: true })
  beneficiaryName: string | null;
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;
  @Column({ name: 'concept', type: 'varchar', length: 300 }) concept: string;
  @Column({ name: 'total', type: 'numeric', precision: 12, scale: 2 })
  total: string;
  @Column({ name: 'paid_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount: string;
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'OPEN' })
  status: FinanceDocStatus;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;
}

@Entity('payable_payments')
export class PayablePayment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'payable_id', type: 'uuid' }) payableId: string;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: string;
  @Column({ name: 'method', type: 'varchar', length: 30, default: 'CASH' })
  method: string;
  @Column({ name: 'notes', type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
