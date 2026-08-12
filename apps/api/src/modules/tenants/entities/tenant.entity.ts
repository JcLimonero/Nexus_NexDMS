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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
