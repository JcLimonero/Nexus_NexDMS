import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

export enum CfdiTypeEnum {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  PAYMENT = 'PAYMENT',
}

export enum CfdiStatusEnum {
  VALID = 'VALID',
  CANCELLED = 'CANCELLED',
}

@Entity('cfdi_logs')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['satUuid'], { unique: true })
@Index(['referenceType'])
@Index(['createdAt'])
export class CfdiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50 })
  referenceType: string;

  @Column({ name: 'cfdi_type', type: 'enum', enum: CfdiTypeEnum })
  cfdiType: CfdiTypeEnum;

  @Column({ name: 'sat_uuid', type: 'varchar', length: 100, unique: true })
  satUuid: string;

  @Column({
    name: 'facturaapi_invoice_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  facturaapiInvoiceId: string | null;

  @Column({ name: 'series', type: 'varchar', length: 10 })
  series: string;

  @Column({ name: 'fiscal_folio', type: 'varchar', length: 20 })
  fiscalFolio: string;

  @Column({ name: 'xml_key', type: 'varchar', length: 500 })
  xmlKey: string;

  @Column({ name: 'pdf_key', type: 'varchar', length: 500 })
  pdfKey: string;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'status', type: 'enum', enum: CfdiStatusEnum })
  status: CfdiStatusEnum;

  @Column({
    name: 'cancellation_reason',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  cancellationReason: string | null;

  @Column({ name: 'cancelled_by_id', type: 'uuid', nullable: true })
  cancelledById: string | null;

  @Column({ name: 'stamped_at', type: 'timestamp' })
  stampedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'cancelled_by_id' })
  cancelledBy?: User;
}
