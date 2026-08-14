import {
  JoinColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LegalEntity } from '../../legal-entities/entities/legal-entity.entity';

@Entity('branches')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId'])
@Index(['legalEntityId'])
@Index(['slug'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'legal_entity_id', type: 'uuid' })
  legalEntityId: string;

  /**
   * Razón social de la que cuelga. Es donde viven los datos fiscales, así que
   * cualquier operación que timbre necesita esta relación cargada.
   */
  @ManyToOne(() => LegalEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'legal_entity_id' })
  legalEntity?: LegalEntity;

  @Column({ name: 'name', length: 200 })
  name: string;

  @Column({ name: 'slug', length: 100 })
  slug: string;





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

  /**
   * Minutos que se espera a un cliente antes de dar la cita por perdida.
   * `0` apaga la regla en esta sucursal y deja el cierre a mano.
   */
  @Column({ name: 'no_show_tolerance_min', type: 'int', default: 30 })
  noShowToleranceMin: number;

  @Column({ name: 'horario', type: 'jsonb' })
  schedule: object;

  @Column({ name: 'logo_key', type: 'varchar', length: 500, nullable: true })
  logoKey: string | null;


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
