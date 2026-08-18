import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';

export enum RoleEnum {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WAREHOUSE = 'WAREHOUSE',
  CASHIER = 'CASHIER',
  MECHANIC = 'MECHANIC',
  /**
   * Recibe unidades en la rampa: cita → estado → fotos → cotización. Su
   * portal es la recepción, no el DMS completo.
   */
  RECEPTIONIST = 'RECEPTIONIST',
  SELLER = 'SELLER',
  EXECUTIVE = 'EXECUTIVE',
  LEGAL_ENTITY_MANAGER = 'LEGAL_ENTITY_MANAGER',
  ADMIN_MANAGER = 'ADMIN_MANAGER',
  PARTS_MANAGER = 'PARTS_MANAGER',
  AFTERSALES_MANAGER = 'AFTERSALES_MANAGER',
  IT_MANAGER = 'IT_MANAGER',
  AML_OFFICER = 'AML_OFFICER',
  DOCUMENT_VALIDATOR = 'DOCUMENT_VALIDATOR',
  AUDITOR = 'AUDITOR',
}

export enum ScopeEnum {
  GLOBAL = 'GLOBAL',
  LEGAL_ENTITY = 'LEGAL_ENTITY', // Razón social
  SUCURSAL = 'SUCURSAL',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
@Index(['tenantId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'first_name', length: 200 })
  firstName: string;

  @Column({ name: 'last_name', length: 200 })
  lastName: string;

  @Column({ name: 'email', length: 300 })
  email: string;

  @Column({ name: 'password_hash', length: 500 })
  passwordHash: string;

  @Column({ name: 'scope', type: 'enum', enum: ScopeEnum })
  scope: ScopeEnum;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ name: 'login_attempts', type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ name: 'blocked_until', type: 'timestamp', nullable: true })
  blockedUntil: Date | null;

  @Column({ name: 'totp_enabled', type: 'boolean', default: false })
  totpEnabled: boolean;

  @Column({ name: 'totp_secret', type: 'text', nullable: true })
  totpSecret: string | null;

  @Column({ name: 'totp_verified_at', type: 'timestamp', nullable: true })
  totpVerifiedAt: Date | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** Especialidad del mecánico (hojalatero, pintor, general…). */
  @Column({ name: 'specialty', type: 'varchar', length: 100, nullable: true })
  specialty: string | null;

  @Column({ name: 'avatar_key', type: 'varchar', length: 500, nullable: true })
  avatarKey: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => UserRole, (ur) => ur.user)
  roles?: UserRole[];
}
