import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Usuario del portal de administración del SaaS (Nexus). Es una identidad
 * INDEPENDIENTE de los usuarios de los tenants: vive en su propia tabla y no
 * pertenece a ningún cliente. Administra tenants, planes, roles, etc.
 */
@Entity('admin_users')
@Index(['email'], { unique: true })
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email', type: 'varchar', length: 200 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'login_attempts', type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ name: 'blocked_until', type: 'timestamp', nullable: true })
  blockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
