import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantPlanEnum {
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenants')
@Index(['slug'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', length: 200 })
  name: string;

  @Column({ name: 'slug', length: 100 })
  slug: string;

  @Column({ name: 'plan', type: 'enum', enum: TenantPlanEnum })
  plan: TenantPlanEnum;

  /** Módulos habilitados para el tenant; null = todos (sin restricción). */
  @Column({ name: 'enabled_modules', type: 'jsonb', nullable: true })
  enabledModules: string[] | null;

  /**
   * Flujo de estatus de taller configurable: mapa from → [to, ...].
   * null = usar el flujo por defecto del sistema.
   */
  @Column({ name: 'service_flow', type: 'jsonb', nullable: true })
  serviceFlow: Record<string, string[]> | null;

  /** Config PLD (umbrales UMA); null = defaults del sistema. */
  @Column({ name: 'pld_config', type: 'jsonb', nullable: true })
  pldConfig: Record<string, number> | null;

  /**
   * Reglas de "salir con adeudo" (R6).
   * - promiseDaysCap: tope de días de la fecha promesa (0/undefined = sin tope).
   * - creditCheckEnabled: valida el límite de crédito del cliente al entregar.
   */
  @Column({ name: 'credit_config', type: 'jsonb', nullable: true })
  creditConfig: {
    promiseDaysCap?: number;
    creditCheckEnabled?: boolean;
  } | null;

  /**
   * Paquete comercial contratado. El nivel técnico sigue viviendo en `plan`:
   * este campo dice cuál de los paquetes con ese nivel se le vendió, que es lo
   * que determina el precio.
   */
  @Column({ name: 'saas_plan_id', type: 'uuid', nullable: true })
  saasPlanId: string | null;

  // ── Ficha comercial: con quién se trata y a dónde se factura ──
  @Column({ name: 'contact_name', type: 'varchar', length: 200, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 200, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 30, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ name: 'billing_email', type: 'varchar', length: 200, nullable: true })
  billingEmail: string | null;

  @Column({ name: 'address', type: 'varchar', length: 400, nullable: true })
  address: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  /** Desde cuándo paga; sirve para calcular antigüedad y periodos debidos. */
  @Column({ name: 'subscription_start', type: 'date', nullable: true })
  subscriptionStart: string | null;

  /** Día del mes en que se le cobra. */
  @Column({ name: 'billing_day', type: 'int', nullable: true })
  billingDay: number | null;

  /**
   * Módulos contratados por encima de lo que incluye su plan. Se cobran aparte
   * y se suman a los que el plan ya trae.
   */
  @Column({ name: 'extra_modules', type: 'jsonb', nullable: true })
  extraModules: string[] | null;

  /**
   * Marca del cliente: su logotipo y su paleta.
   *
   * `palette` es el identificador de una paleta del catálogo, no los colores
   * sueltos: si mañana se corrige un tono por contraste, la corrección alcanza
   * a todos los que la eligieron en vez de quedarse congelada aquí.
   */
  @Column({ name: 'logo_key', type: 'varchar', length: 500, nullable: true })
  logoKey: string | null;

  @Column({ name: 'palette', type: 'varchar', length: 40, default: 'nexus' })
  palette: string;

  /** Divisa del tenant (ISO 4217), p. ej. MXN, USD. */
  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
