import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('branches')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId'])
@Index(['brandId'])
@Index(['slug'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column({ name: 'name', length: 200 })
  name: string;

  @Column({ name: 'slug', length: 100 })
  slug: string;

  @Column({ name: 'rfc', length: 13 })
  rfc: string;

  @Column({ name: 'legal_name', length: 300 })
  legalName: string;

  @Column({ name: 'tax_regime', length: 10 })
  taxRegime: string;

  @Column({ name: 'tax_postal_code', length: 10 })
  taxPostalCode: string;

  @Column({ name: 'address', length: 500 })
  address: string;

  @Column({ name: 'city', length: 100 })
  city: string;

  @Column({ name: 'state', length: 100 })
  state: string;

  @Column({ name: 'counter_phone', length: 20 })
  counterPhone: string;

  @Column({ name: 'parts_phone', type: 'varchar', length: 20, nullable: true })
  partsPhone: string | null;

  @Column({
    name: 'appointments_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  appointmentsPhone: string | null;

  @Column({
    name: 'aftersales_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  aftersalesPhone: string | null;

  @Column({ name: 'email', length: 200 })
  email: string;

  @Column({ name: 'horario', type: 'jsonb' })
  schedule: object;

  @Column({ name: 'logo_key', type: 'varchar', length: 500, nullable: true })
  logoKey: string | null;

  @Column({
    name: 'facturaapi_org_id',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  facturaapiOrgId: string | null;

  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 50,
    default: 'America/Mexico_City',
  })
  timezone: string;

  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 0.16,
  })
  taxRate: number;

  @Column({
    name: 'max_discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10,
  })
  maxDiscountPct: number;

  @Column({ name: 'quotation_validity_days', type: 'int', default: 15 })
  quotationValidityDays: number;

  @Column({ name: 'cfdi_serie', type: 'varchar', length: 5, nullable: true })
  cfdiSerie: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
