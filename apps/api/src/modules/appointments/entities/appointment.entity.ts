import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Client } from '../../clients/entities/client.entity';
import { CustomerVehicle } from '../../customer-vehicles/entities/customer-vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { ServiceType } from '../../service-types/entities/service-type.entity';

export enum AppointmentOriginEnum {
  INTERNAL = 'INTERNAL',
  PUBLIC_PORTAL = 'PUBLIC_PORTAL',
}

export enum AppointmentStatusEnum {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('appointments')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['scheduledAt'])
@Index(['createdAt'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  /** Técnico que hará la reparación. */
  @Column({ name: 'mechanic_id', type: 'uuid', nullable: true })
  mechanicId: string | null;

  /**
   * Asesor de servicio que atiende al cliente y recibe la unidad. Es otra
   * persona y otro cuello de botella: el mostrador se satura en la mañana
   * aunque el taller tenga técnicos libres.
   */
  @Column({ name: 'advisor_id', type: 'uuid', nullable: true })
  advisorId: string | null;

  @Column({ name: 'origin', type: 'enum', enum: AppointmentOriginEnum })
  origin: AppointmentOriginEnum;

  @Column({ name: 'status', type: 'enum', enum: AppointmentStatusEnum })
  status: AppointmentStatusEnum;

  @Column({ name: 'service_type', type: 'varchar', length: 200 })
  serviceType: string;

  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId: string | null;

  @Column({ name: 'client_name', type: 'varchar', length: 200 })
  clientName: string;

  @Column({ name: 'client_phone', type: 'varchar', length: 20 })
  clientPhone: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_min', type: 'int', default: 60 })
  durationMin: number;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'advisor_id' })
  advisor?: User;

  @ManyToOne(() => ServiceType, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_type_id' })
  serviceTypeRelation?: ServiceType;
}
