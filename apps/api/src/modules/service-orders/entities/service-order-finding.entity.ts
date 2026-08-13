import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { User } from '../../users/entities/user.entity';

export enum ServiceOrderFindingMediaTypeEnum {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}

/**
 * Qué tan urgente es lo que encontró el técnico. Le sirve al asesor para
 * saber qué defender en la llamada y al cliente para decidir.
 */
export enum FindingCriticalityEnum {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

/** Ciclo de vida del trabajo adicional. */
export enum FindingStatusEnum {
  PENDIENTE = 'PENDIENTE',
  COTIZADO = 'COTIZADO',
  AUTORIZADO = 'AUTORIZADO',
  RECHAZADO = 'RECHAZADO',
}

@Entity('service_order_findings')
export class ServiceOrderFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'requires_quotation', type: 'boolean', default: true })
  requiresQuotation: boolean;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: ServiceOrderFindingMediaTypeEnum,
  })
  mediaType: ServiceOrderFindingMediaTypeEnum;

  @Column({ name: 'media_key', type: 'varchar', length: 500 })
  mediaKey: string;

  @Column({ name: 'client_notified_at', type: 'timestamp', nullable: true })
  clientNotifiedAt: Date | null;

  @Column({
    name: 'criticality',
    type: 'varchar',
    length: 10,
    default: FindingCriticalityEnum.MEDIA,
  })
  criticality: FindingCriticalityEnum;

  /** Lo que el técnico estima que le llevará, para replanificar la entrega. */
  @Column({ name: 'estimated_minutes', type: 'int', default: 0 })
  estimatedMinutes: number;

  @Column({
    name: 'estimated_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v === null ? 0 : Number(v)),
    },
  })
  estimatedAmount: number;

  /** Cotización que se le mandó al cliente por este hallazgo. */
  @Column({ name: 'quotation_id', type: 'uuid', nullable: true })
  quotationId: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: FindingStatusEnum.PENDIENTE,
  })
  status: FindingStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, (so) => so.findings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
