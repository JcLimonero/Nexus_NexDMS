import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant, TenantPlanEnum } from '../../tenants/entities/tenant.entity';

const dinero = {
  to: (v: number) => v,
  from: (v: string | null) => (v === null ? 0 : Number(v)),
};

/**
 * Precio de un plan.
 *
 * `key` coincide con el valor del enum `tenants.plan`: el enum sigue mandando
 * qué módulos entran en cada nivel, y aquí solo se le cuelga el precio. Así el
 * comercial ajusta tarifas sin tocar reglas de licencia.
 */
@Entity('saas_plans')
export class SaasPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'key', type: 'varchar', length: 20 })
  key: string;

  /**
   * Nivel técnico que otorga: el enum `tenants.plan` de siempre. Es el tope de
   * lo contratable y lo que leen el guard y las reglas de licencia.
   */
  @Column({ name: 'tier', type: 'varchar', length: 20, default: 'BASIC' })
  tier: TenantPlanEnum;

  /**
   * Qué módulos entrega el paquete. `null` = todo lo que el nivel permite,
   * que es como se comportaban los tres planes de origen.
   */
  @Column({ name: 'included_modules', type: 'jsonb', nullable: true })
  includedModules: string[] | null;

  /** Los tres de origen: su clave es el enum, así que no se borra ni se cambia. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'monthly_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  monthlyPrice: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** Lo que cuesta un módulo contratado fuera de lo que incluye el plan. */
@Entity('saas_module_prices')
export class SaasModulePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'module_key', type: 'varchar', length: 50 })
  moduleKey: string;

  @Column({
    name: 'monthly_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  monthlyPrice: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export enum SaasPaymentStatusEnum {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  VENCIDO = 'VENCIDO',
  CANCELADO = 'CANCELADO',
}

/**
 * Un cobro mensual al cliente del SaaS.
 *
 * Se guarda el periodo como `AAAA-MM` y se hace único por tenant: un mes no
 * puede cobrarse dos veces, y esa restricción evita duplicados cuando alguien
 * registra el mismo pago desde dos sitios.
 */
@Entity('saas_payments')
export class SaasPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'period', type: 'varchar', length: 7 })
  period: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: dinero,
  })
  amount: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: SaasPaymentStatusEnum.PENDIENTE,
  })
  status: SaasPaymentStatusEnum;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'method', type: 'varchar', length: 30, nullable: true })
  method: string | null;

  @Column({ name: 'reference', type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'concept', type: 'varchar', length: 300, nullable: true })
  concept: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;
}
