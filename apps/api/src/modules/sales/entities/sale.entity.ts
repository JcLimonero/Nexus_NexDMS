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
import { CashSession } from '../../cash-register/entities/cash-session.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';
import { SalePayment } from './sale-payment.entity';

export enum SaleTypeEnum {
  COUNTER = 'COUNTER',
  SERVICE_ORDER = 'SERVICE_ORDER',
}

export enum SaleStatusEnum {
  OPEN = 'OPEN',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethodEnum {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MIXED = 'MIXED',
}

export enum PriceListEnum {
  PUBLIC = 'PUBLIC',
  WHOLESALE = 'WHOLESALE',
  BUSINESS = 'BUSINESS',
}

@Entity('sales')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['cashSessionId'])
@Index(['status'])
@Index(['ticketNumber'])
@Index(['createdAt'])
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId: string | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'sale_type', type: 'enum', enum: SaleTypeEnum })
  saleType: SaleTypeEnum;

  @Column({ name: 'status', type: 'enum', enum: SaleStatusEnum })
  status: SaleStatusEnum;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @Column({ name: 'price_list', type: 'enum', enum: PriceListEnum })
  priceList: PriceListEnum;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({
    name: 'discount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2 })
  taxAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'ticket_number', type: 'varchar', length: 50 })
  ticketNumber: string;

  @Column({ name: 'cfdi_uuid', type: 'varchar', length: 100, nullable: true })
  cfdiUuid: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => CashSession, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'cash_session_id' })
  cashSession?: CashSession;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => SaleItem, (item) => item.sale)
  items?: SaleItem[];

  @OneToMany(() => SalePayment, (p) => p.sale)
  payments?: SalePayment[];
}
