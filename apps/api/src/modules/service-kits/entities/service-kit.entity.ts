import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

const decimal = {
  to: (v: number) => v,
  from: (v: string | null) => (v === null ? 0 : Number(v)),
};

/**
 * Paquete de servicio: la mano de obra y las refacciones que van juntas.
 * Es lo que permite al asesor cotizar un "mantenimiento de 10 mil" con un
 * clic en vez de armarlo línea por línea cada vez.
 *
 * `tenantId = null` es un kit de fábrica, visible para todos los tenants;
 * mismo criterio que el catálogo de fotos de recepción.
 */
@Entity('service_kits')
export class ServiceKit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  /** Familia del kit: genérico, de marca o propio del taller. */
  @Column({ name: 'kit_type', type: 'varchar', length: 50, default: 'GENERICO' })
  kitType: string;

  @Column({ name: 'name', type: 'varchar', length: 300 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  /** null = aplica a cualquier tipo de unidad. */
  @Column({ name: 'vehicle_types', type: 'text', array: true, nullable: true })
  vehicleTypes: string[] | null;

  @Column({ name: 'labor_minutes', type: 'int', default: 0 })
  laborMinutes: number;

  @Column({
    name: 'labor_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimal,
  })
  laborPrice: number;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ServiceKitItem, (i) => i.kit, { cascade: true })
  items?: ServiceKitItem[];
}

/** Una refacción del kit. Se casa con el catálogo del tenant por SKU. */
@Entity('service_kit_items')
export class ServiceKitItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kit_id', type: 'uuid' })
  kitId: string;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ name: 'description', type: 'varchar', length: 300 })
  description: string;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimal,
  })
  unitPrice: number;

  @ManyToOne(() => ServiceKit, (k) => k.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_id' })
  kit?: ServiceKit;
}
