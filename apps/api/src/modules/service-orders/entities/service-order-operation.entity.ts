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

/**
 * A quién se le carga el trabajo. Sin esto no se puede separar lo que paga
 * el cliente de lo que absorbe la garantía o el propio taller, que es
 * justo lo que la dirección necesita ver por separado.
 */
export enum ChargeTypeEnum {
  CLIENT = 'CLIENT',
  WARRANTY = 'WARRANTY',
  INTERNAL = 'INTERNAL',
  QUOTE = 'QUOTE',
  FAST_SERVICE = 'FAST_SERVICE',
}

export const CHARGE_TYPE_LABELS: Record<ChargeTypeEnum, string> = {
  [ChargeTypeEnum.CLIENT]: 'Cliente',
  [ChargeTypeEnum.WARRANTY]: 'Garantía',
  [ChargeTypeEnum.INTERNAL]: 'Interno',
  [ChargeTypeEnum.QUOTE]: 'Presupuesto',
  [ChargeTypeEnum.FAST_SERVICE]: 'Servicio rápido',
};

export enum OperationStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

/** De dónde salió la operación, para poder rastrear el origen del trabajo. */
export enum OperationSourceEnum {
  RECEPTION = 'RECEPTION',
  FINDING = 'FINDING',
  KIT = 'KIT',
}

/**
 * Una línea de trabajo de la orden. El fichaje del técnico apunta aquí, así
 * que es la unidad contra la que se mide el tiempo real frente al baremo.
 */
@Entity('service_order_operations')
export class ServiceOrderOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  /** Código de mano de obra del fabricante. */
  @Column({ name: 'code', type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  /** Tiempo baremo: lo que el fabricante dice que debe tardar. */
  @Column({ name: 'standard_minutes', type: 'int', default: 0 })
  standardMinutes: number;

  @Column({
    name: 'labor_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v === null ? 0 : Number(v)),
    },
  })
  laborPrice: number;

  @Column({
    name: 'charge_type',
    type: 'varchar',
    length: 20,
    default: ChargeTypeEnum.CLIENT,
  })
  chargeType: ChargeTypeEnum;

  @Column({ name: 'charge_account', type: 'varchar', length: 50, nullable: true })
  chargeAccount: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: OperationStatusEnum.PENDING,
  })
  status: OperationStatusEnum;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 20,
    default: OperationSourceEnum.RECEPTION,
  })
  source: OperationSourceEnum;

  @Column({ name: 'finding_id', type: 'uuid', nullable: true })
  findingId: string | null;

  @Column({ name: 'kit_id', type: 'uuid', nullable: true })
  kitId: string | null;

  @Column({ name: 'mechanic_id', type: 'uuid', nullable: true })
  mechanicId: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic?: User;
}
