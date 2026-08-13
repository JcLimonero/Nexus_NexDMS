import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';

/**
 * Acceso del cliente al portal.
 *
 * A propósito no hay contraseña: el cliente pide un código, le llega por
 * WhatsApp al mismo número que ya tiene registrado en el taller, y con eso
 * entra. Un taller no debería custodiar contraseñas de sus clientes, y el
 * número ya está verificado por el propio uso del servicio.
 *
 * El código se guarda hasheado y con caducidad, como cualquier credencial.
 */
@Entity('portal_users')
export class PortalUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'phone', type: 'varchar', length: 30 })
  phone: string;

  @Column({ name: 'email', type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ name: 'otp_hash', type: 'varchar', length: 200, nullable: true })
  otpHash: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt: Date | null;

  /** Se corta el acceso tras varios intentos fallidos del mismo código. */
  @Column({ name: 'otp_attempts', type: 'int', default: 0 })
  otpAttempts: number;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}

export enum PortalMessageSenderEnum {
  CLIENT = 'CLIENT',
  STAFF = 'STAFF',
}

/** Un mensaje de la conversación entre el cliente y su asesor. */
@Entity('portal_messages')
export class PortalMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'sender', type: 'varchar', length: 10 })
  sender: PortalMessageSenderEnum;

  /** Quién del taller escribió; null cuando escribe el cliente. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'body', type: 'text' })
  body: string;

  @Column({
    name: 'attachment_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  attachmentKey: string | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;
}
