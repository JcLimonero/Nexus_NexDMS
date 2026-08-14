import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceKit } from '../../service-kits/entities/service-kit.entity';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Una fase del paquete: por dónde pasa la unidad, cuánto debería tardar y
 * quién la ejecuta.
 *
 * El ejecutor se guarda como rol y no como persona: el paquete es una
 * plantilla que se aplica en cualquier sucursal, y una persona concreta solo
 * existe en una.
 */
@Entity('service_kit_phases')
export class ServiceKitPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kit_id', type: 'uuid' })
  kitId: string;

  @Column({ name: 'sequence', type: 'int' })
  sequence: number;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'estimated_min', type: 'int', default: 30 })
  estimatedMin: number;

  @Column({ name: 'role', type: 'varchar', length: 40, nullable: true })
  role: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceKit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_id' })
  kit?: ServiceKit;
}

export enum PhaseStatusEnum {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  TERMINADA = 'TERMINADA',
  OMITIDA = 'OMITIDA',
}

/**
 * La fase de una orden concreta.
 *
 * Se copia del paquete al aplicarlo, con su nombre y su estimado: la orden
 * tiene que conservar el plan con el que se abrió aunque el paquete cambie
 * después, o el tablero acusaría de retraso contra un baremo que no era el
 * vigente ese día.
 */
@Entity('service_order_phases')
@Index(['status'])
export class ServiceOrderPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'kit_phase_id', type: 'uuid', nullable: true })
  kitPhaseId: string | null;

  @Column({ name: 'sequence', type: 'int' })
  sequence: number;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'estimated_min', type: 'int', default: 30 })
  estimatedMin: number;

  @Column({ name: 'role', type: 'varchar', length: 40, nullable: true })
  role: string | null;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: PhaseStatusEnum.PENDIENTE,
  })
  status: PhaseStatusEnum;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser?: User;
}
