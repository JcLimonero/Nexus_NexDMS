import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditActionEnum {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  CANCEL = 'CANCEL',
}

@Entity('audit_logs')
@Index(['tenantId'])
@Index(['userId'])
@Index(['tableName'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'action', type: 'enum', enum: AuditActionEnum })
  action: AuditActionEnum;

  @Column({ name: 'table_name', type: 'varchar', length: 100 })
  tableName: string;

  @Column({ name: 'record_id', type: 'uuid', nullable: true })
  recordId: string | null;

  @Column({ name: 'payload_before', type: 'jsonb', nullable: true })
  payloadBefore: object | null;

  @Column({ name: 'payload_after', type: 'jsonb', nullable: true })
  payloadAfter: object | null;

  @Column({ name: 'ip', type: 'varchar', length: 50, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
