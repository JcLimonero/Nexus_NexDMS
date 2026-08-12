import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Client } from '../../clients/entities/client.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { CustomerVehicle } from '../../customer-vehicles/entities/customer-vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Quotation } from '../../quotations/entities/quotation.entity';
import { ServiceType } from '../../service-types/entities/service-type.entity';
import { ReceptionChecklist } from './reception-checklist.entity';
import { ServiceOrderPart } from './service-order-part.entity';
import { ServiceOrderTime } from './service-order-time.entity';
import { ServiceOrderUpdate } from './service-order-update.entity';
import { ServiceOrderFinding } from './service-order-finding.entity';

export enum ServiceOrderStatusEnum {
  RECEIVED = 'RECEIVED',
  DIAGNOSIS = 'DIAGNOSIS',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceOrderPaymentMethodEnum {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MIXED = 'MIXED',
}

@Entity('service_orders')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['folio'])
@Index(['createdAt'])
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'reception_contact_id', type: 'uuid', nullable: true })
  receptionContactId: string | null;

  @Column({
    name: 'reception_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  receptionName: string | null;

  @Column({
    name: 'reception_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  receptionPhone: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'mechanic_id', type: 'uuid', nullable: true })
  mechanicId: string | null;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null;

  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId: string | null;

  @Column({ name: 'quotation_id', type: 'uuid', nullable: true })
  quotationId: string | null;

  @Column({ name: 'folio', type: 'varchar', length: 50 })
  folio: string;

  /** Token para el link público de seguimiento (sin auth). */
  @Column({
    name: 'tracking_token',
    type: 'uuid',
    default: () => 'uuid_generate_v4()',
  })
  trackingToken: string;

  @Column({ name: 'status', type: 'enum', enum: ServiceOrderStatusEnum })
  status: ServiceOrderStatusEnum;

  @Column({ name: 'reported_fault', type: 'text' })
  reportedFault: string;

  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ name: 'work_performed', type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({ name: 'km_in', type: 'int' })
  kmIn: number;

  @Column({ name: 'km_out', type: 'int', nullable: true })
  kmOut: number | null;

  @Column({
    name: 'labor_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  laborCost: number;

  @Column({
    name: 'parts_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  partsCost: number;

  @Column({
    name: 'discount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ServiceOrderPaymentMethodEnum,
    nullable: true,
  })
  paymentMethod: ServiceOrderPaymentMethodEnum | null;

  @Column({ name: 'cfdi_uuid', type: 'varchar', length: 100, nullable: true })
  cfdiUuid: string | null;

  @Column({ name: 'received_at', type: 'timestamp' })
  receivedAt: Date;

  @Column({ name: 'promised_at', type: 'timestamp', nullable: true })
  promisedAt: Date | null;

  @Column({ name: 'ready_at', type: 'timestamp', nullable: true })
  readyAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'owner_id' })
  owner?: Client;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;

  @ManyToOne(() => Contact, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'reception_contact_id' })
  receptionContact?: Contact;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic?: User;

  @ManyToOne(() => Appointment, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @ManyToOne(() => ServiceType, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_type_id' })
  serviceTypeRelation?: ServiceType;

  @ManyToOne(() => Quotation, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'quotation_id' })
  quotation?: Quotation;

  @OneToOne(() => ReceptionChecklist, (c) => c.serviceOrder, { nullable: true })
  checklist?: ReceptionChecklist;

  @OneToMany(() => ServiceOrderPart, (p) => p.serviceOrder)
  parts?: ServiceOrderPart[];

  @OneToMany(() => ServiceOrderTime, (t) => t.serviceOrder)
  timeEntries?: ServiceOrderTime[];

  @OneToMany(() => ServiceOrderUpdate, (u) => u.serviceOrder)
  updates?: ServiceOrderUpdate[];

  @OneToMany(() => ServiceOrderFinding, (f) => f.serviceOrder)
  findings?: ServiceOrderFinding[];
}
