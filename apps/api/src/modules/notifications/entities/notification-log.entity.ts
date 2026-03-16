import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationChannelEnum {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationStatusEnum {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('notification_logs')
@Index(['tenantId'])
@Index(['referenceType', 'referenceId'])
@Index(['createdAt'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ name: 'channel', type: 'enum', enum: NotificationChannelEnum })
  channel: NotificationChannelEnum;

  @Column({ name: 'template_key', type: 'varchar', length: 50 })
  templateKey: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50 })
  referenceType: string;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId: string;

  @Column({ name: 'recipient', type: 'varchar', length: 300 })
  recipient: string;

  @Column({ name: 'status', type: 'enum', enum: NotificationStatusEnum })
  status: NotificationStatusEnum;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: object | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
