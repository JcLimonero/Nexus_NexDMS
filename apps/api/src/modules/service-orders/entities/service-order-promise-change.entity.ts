import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Bitácora de cambios a la fecha prometida de entrega de una orden de servicio.
 * Cada cambio exige una justificación y queda registrado con quién y cuándo,
 * para poder responder al cliente por qué se movió la fecha.
 */
@Entity('service_order_promise_changes')
@Index(['serviceOrderId'])
export class ServiceOrderPromiseChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'old_promised_at', type: 'timestamp', nullable: true })
  oldPromisedAt: Date | null;

  @Column({ name: 'new_promised_at', type: 'timestamp', nullable: true })
  newPromisedAt: Date | null;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy?: User;
}
