import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WAREHOUSE = 'WAREHOUSE',
  CASHIER = 'CASHIER',
  MECHANIC = 'MECHANIC',
  SELLER = 'SELLER',
}

export enum ScopeEnum {
  GLOBAL = 'GLOBAL',
  BRAND = 'BRAND',
  BRANCH = 'BRANCH',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
@Index(['tenantId'])
@Index(['branchId'])
@Index(['brandId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @Column({ name: 'first_name', length: 200 })
  firstName: string;

  @Column({ name: 'last_name', length: 200 })
  lastName: string;

  @Column({ name: 'email', length: 300 })
  email: string;

  @Column({ name: 'password_hash', length: 500 })
  passwordHash: string;

  @Column({ name: 'role', type: 'enum', enum: RoleEnum })
  role: RoleEnum;

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
}
