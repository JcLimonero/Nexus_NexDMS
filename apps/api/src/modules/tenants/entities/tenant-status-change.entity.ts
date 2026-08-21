import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Bitácora de cambios de estatus de un cliente (suspender / reactivar).
 *
 * Suspender o reactivar corta o devuelve el acceso de todo un cliente, así que
 * no puede ser un clic anónimo: se guarda quién lo hizo, cuándo y por qué, para
 * poder rendir cuentas después de por qué una cuenta quedó fuera.
 */
@Entity('tenant_status_changes')
@Index(['tenantId', 'createdAt'])
export class TenantStatusChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  /** Estado antes del cambio (activo = true). */
  @Column({ name: 'previous_active', type: 'boolean' })
  previousActive: boolean;

  /** Estado después del cambio. */
  @Column({ name: 'new_active', type: 'boolean' })
  newActive: boolean;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  /** Quién lo hizo (id del usuario/admin que autenticó la acción). */
  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
