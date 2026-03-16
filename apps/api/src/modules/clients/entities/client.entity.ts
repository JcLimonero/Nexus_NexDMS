import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClientTypeEnum {
  PUBLIC = 'PUBLIC',
  WHOLESALE = 'WHOLESALE',
  COMPANY = 'COMPANY',
}

@Entity('clients')
@Index(['tenantId'])
@Index(['tenantId', 'phone'])
@Index(['tenantId', 'rfc'])
@Index(['tenantId', 'clientType'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'client_type', type: 'enum', enum: ClientTypeEnum })
  clientType: ClientTypeEnum;

  @Column({ name: 'is_company', type: 'boolean', default: false })
  isCompany: boolean;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 200, nullable: true })
  lastName: string | null;

  @Column({ name: 'legal_name', type: 'varchar', length: 300, nullable: true })
  legalName: string | null;

  @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ name: 'curp', type: 'varchar', length: 18, nullable: true })
  curp: string | null;

  @Column({ name: 'tax_regime', type: 'varchar', length: 10, nullable: true })
  taxRegime: string | null;

  @Column({ name: 'tax_postal_code', type: 'varchar', length: 10, nullable: true })
  taxPostalCode: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'phone_alt', type: 'varchar', length: 20, nullable: true })
  phoneAlt: string | null;

  @Column({ name: 'email', type: 'varchar', length: 300, nullable: true })
  email: string | null;

  @Column({ name: 'address', type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ name: 'fixed_discount', type: 'decimal', precision: 5, scale: 2, default: 0 })
  fixedDiscount: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
