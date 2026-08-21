import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BodyworkItem } from './bodywork-item.entity';
import { BodyworkPhoto } from './bodywork-photo.entity';

const dinero = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? 0 : Number(v)),
};

/** Flujo simple de la orden de carrocería. */
export enum BodyworkStatusEnum {
  RECEIVED = 'RECEIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/** Quién paga el trabajo: el cliente directo o una aseguradora por siniestro. */
export enum BodyworkPaymentTypeEnum {
  PARTICULAR = 'PARTICULAR',
  INSURANCE = 'INSURANCE',
}

/**
 * Recepción + orden de trabajo de Hojalatería y Pintura.
 *
 * En el flujo simple, recepción y orden son la misma entidad: se recibe la
 * unidad con sus datos y su daño, se cotiza por pieza ({@link BodyworkItem}) y
 * la misma orden avanza de recibida a entregada. El vehículo va como texto
 * libre (mucho trabajo de carrocería es de unidades externas, no de la cartera).
 */
@Entity('bodywork_orders')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['createdAt'])
export class BodyworkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ name: 'folio', type: 'int' })
  folio: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: BodyworkStatusEnum.RECEIVED,
  })
  status: BodyworkStatusEnum;

  // ── Cliente (opcional ligado a la cartera; snapshot para walk-ins) ──
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'client_name', type: 'varchar', length: 200 })
  clientName: string;

  @Column({ name: 'client_phone', type: 'varchar', length: 30, nullable: true })
  clientPhone: string | null;

  // ── Vehículo (texto libre) ──
  @Column({ name: 'vehicle_plate', type: 'varchar', length: 20, nullable: true })
  vehiclePlate: string | null;

  @Column({ name: 'vehicle_brand', type: 'varchar', length: 60, nullable: true })
  vehicleBrand: string | null;

  @Column({ name: 'vehicle_model', type: 'varchar', length: 60, nullable: true })
  vehicleModel: string | null;

  @Column({ name: 'vehicle_year', type: 'int', nullable: true })
  vehicleYear: number | null;

  @Column({ name: 'vehicle_color', type: 'varchar', length: 40, nullable: true })
  vehicleColor: string | null;

  @Column({ name: 'vehicle_vin', type: 'varchar', length: 40, nullable: true })
  vehicleVin: string | null;

  // ── Cómo se paga ──
  @Column({
    name: 'payment_type',
    type: 'varchar',
    length: 12,
    default: BodyworkPaymentTypeEnum.PARTICULAR,
  })
  paymentType: BodyworkPaymentTypeEnum;

  // Datos del siniestro (solo cuando payment_type = INSURANCE)
  @Column({ name: 'insurance_company', type: 'varchar', length: 120, nullable: true })
  insuranceCompany: string | null;

  @Column({ name: 'policy_number', type: 'varchar', length: 60, nullable: true })
  policyNumber: string | null;

  @Column({ name: 'claim_number', type: 'varchar', length: 60, nullable: true })
  claimNumber: string | null;

  @Column({
    name: 'deductible',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: dinero,
  })
  deductible: number | null;

  @Column({ name: 'adjuster', type: 'varchar', length: 120, nullable: true })
  adjuster: string | null;

  @Column({ name: 'claim_date', type: 'date', nullable: true })
  claimDate: string | null;

  // ── Estado de la unidad al recibir ──
  @Column({ name: 'km_in', type: 'int', nullable: true })
  kmIn: number | null;

  @Column({ name: 'fuel_level', type: 'varchar', length: 20, nullable: true })
  fuelLevel: string | null;

  @Column({ name: 'damage_description', type: 'text', nullable: true })
  damageDescription: string | null;

  @Column({ name: 'observations', type: 'text', nullable: true })
  observations: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;

  // ── Totales (solo de las líneas aprobadas) ──
  @Column({
    name: 'labor_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  laborTotal: number;

  @Column({
    name: 'material_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  materialTotal: number;

  @Column({
    name: 'parts_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  partsTotal: number;

  @Column({
    name: 'total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  total: number;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  receivedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BodyworkItem, (i) => i.order)
  items?: BodyworkItem[];

  @OneToMany(() => BodyworkPhoto, (p) => p.order)
  photos?: BodyworkPhoto[];
}
