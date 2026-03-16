import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('superadmin_audit_log')
@Index(['tenantId'])
@Index(['accion'])
@Index(['createdAt'])
export class SuperadminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ejecutivo_email', type: 'varchar', length: 300 })
  ejecutivoEmail: string;

  @Column({ name: 'accion', type: 'varchar', length: 100 })
  accion: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'sucursal_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ name: 'detalle', type: 'jsonb', nullable: true })
  detalle: object | null;

  @Column({ name: 'ip', type: 'varchar', length: 50, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
