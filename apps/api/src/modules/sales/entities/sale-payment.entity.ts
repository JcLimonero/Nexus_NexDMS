import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

export enum SalePaymentMethodEnum {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

@Entity('sale_payments')
@Index(['saleId'])
export class SalePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @Column({ name: 'method', type: 'enum', enum: SalePaymentMethodEnum })
  method: SalePaymentMethodEnum;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'reference', type: 'varchar', length: 200, nullable: true })
  reference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Sale, (s) => s.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;
}
