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
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { QuotationItem } from './quotation-item.entity';

export enum QuotationTypeEnum {
  PARTS = 'PARTS',
  SERVICE = 'SERVICE',
  UNIT = 'UNIT',
}

export enum QuotationStatusEnum {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export enum QuotationPriceListEnum {
  PUBLIC = 'PUBLIC',
  WHOLESALE = 'WHOLESALE',
  BUSINESS = 'BUSINESS',
}

@Entity('quotations')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['folio'])
@Index(['createdAt'])
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId: string | null;

  @Column({ name: 'type', type: 'enum', enum: QuotationTypeEnum })
  type: QuotationTypeEnum;

  /** Token del enlace público con el que el cliente acepta o rechaza. */
  @Column({
    name: 'client_token',
    type: 'uuid',
    default: () => 'uuid_generate_v4()',
  })
  clientToken: string;

  @Column({ name: 'client_responded_at', type: 'timestamp', nullable: true })
  clientRespondedAt: Date | null;

  @Column({ name: 'client_response_note', type: 'text', nullable: true })
  clientResponseNote: string | null;

  @Column({ name: 'folio', type: 'varchar', length: 50 })
  folio: string;

  @Column({ name: 'status', type: 'enum', enum: QuotationStatusEnum })
  status: QuotationStatusEnum;

  @Column({ name: 'price_list', type: 'enum', enum: QuotationPriceListEnum })
  priceList: QuotationPriceListEnum;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({
    name: 'discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPct: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2 })
  taxAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'conditions', type: 'text', nullable: true })
  conditions: string | null;

  @Column({ name: 'validity_date', type: 'date', nullable: true })
  validityDate: Date | null;

  /** En qué se convirtió: 'unit_sale' o 'service_order', y su id. */
  @Column({
    name: 'converted_to_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  convertedToType: string | null;

  @Column({ name: 'converted_to_id', type: 'uuid', nullable: true })
  convertedToId: string | null;

  @Column({ name: 'pdf_key', type: 'varchar', length: 500, nullable: true })
  pdfKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @OneToMany(() => QuotationItem, (item) => item.quotation)
  items?: QuotationItem[];
}
