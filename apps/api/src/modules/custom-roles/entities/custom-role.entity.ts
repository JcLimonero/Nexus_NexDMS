import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Rol a medida (perfil) definido por un cliente. Es aditivo: agrupa con un
 * nombre propio un conjunto de roles base del sistema, y quien lo tenga alcanza
 * la unión de lo que esos roles base alcanzan. No inventa permisos nuevos ni
 * toca el control de acceso base.
 */
@Entity('custom_roles')
@Index(['tenantId'])
export class CustomRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  /** Roles base (RoleEnum) que componen el perfil. */
  @Column({ name: 'base_roles', type: 'jsonb', default: () => "'[]'" })
  baseRoles: string[];

  @Column({ name: 'description', type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
