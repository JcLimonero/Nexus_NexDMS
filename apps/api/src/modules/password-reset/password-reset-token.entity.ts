import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A qué padrón de usuarios pertenece el token. */
export enum ResetUserType {
  TENANT = 'TENANT',
  ADMIN = 'ADMIN',
}

/**
 * Token de recuperación de contraseña, válido para los dos padrones de
 * usuarios (los del tenant y los del portal admin). Se guarda solo el hash del
 * token —nunca el token en claro— con vencimiento y marca de uso único.
 */
@Entity('password_reset_tokens')
@Index(['tokenHash'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_type', type: 'varchar', length: 10 })
  userType: ResetUserType;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** SHA-256 (hex) del token entregado al usuario. */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
