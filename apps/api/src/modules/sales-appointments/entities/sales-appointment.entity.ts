import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SalesAppointmentPurposeEnum {
  TEST_DRIVE = 'TEST_DRIVE',
  DELIVERY = 'DELIVERY',
  VISIT = 'VISIT',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum SalesAppointmentStatusEnum {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

/** Cita del área de ventas: prueba de manejo, entrega, visita o seguimiento. */
@Entity('sales_appointments')
@Index(['tenantId'])
@Index(['branchId', 'scheduledAt'])
export class SalesAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'client_name', type: 'varchar', length: 200 })
  clientName: string;

  @Column({ name: 'client_phone', type: 'varchar', length: 20, nullable: true })
  clientPhone: string | null;

  /** Asesor de ventas que atiende la cita. */
  @Column({ name: 'seller_id', type: 'uuid', nullable: true })
  sellerId: string | null;

  /** Unidad de interés (del catálogo), si aplica. */
  @Column({ name: 'catalog_unit_id', type: 'uuid', nullable: true })
  catalogUnitId: string | null;

  @Column({ name: 'unit_label', type: 'varchar', length: 200, nullable: true })
  unitLabel: string | null;

  @Column({ name: 'purpose', type: 'varchar', length: 20 })
  purpose: SalesAppointmentPurposeEnum;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: SalesAppointmentStatusEnum;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_min', type: 'int', default: 60 })
  durationMin: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
