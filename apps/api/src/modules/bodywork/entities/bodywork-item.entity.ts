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
import { BodyworkOrder } from './bodywork-order.entity';

const dinero = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? 0 : Number(v)),
};

/** Qué se le hace a la pieza. */
export enum BodyworkOperationEnum {
  REPAIR = 'REPAIR',
  REPLACE = 'REPLACE',
  PAINT = 'PAINT',
}

/** Autorización por línea (cliente o ajustador aprueba pieza por pieza). */
export enum BodyworkItemStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Una pieza de la orden con su operación. Es la partida del presupuesto: cada
 * pieza afectada lleva una operación (reparar, cambiar o pintar) con su mano de
 * obra, su material y —si se cambia— el costo de la pieza. Una misma pieza que
 * se repara y se pinta son dos partidas, para que cada trabajo se cotice y se
 * autorice por separado.
 */
@Entity('bodywork_items')
@Index(['tenantId'])
@Index(['orderId'])
export class BodyworkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  /** Pieza del catálogo (opcional; puede ser texto libre). */
  @Column({ name: 'bodywork_part_id', type: 'uuid', nullable: true })
  bodyworkPartId: string | null;

  /** Nombre de la pieza al momento (snapshot, sobrevive a cambios de catálogo). */
  @Column({ name: 'part_name', type: 'varchar', length: 120 })
  partName: string;

  @Column({ name: 'operation', type: 'varchar', length: 12 })
  operation: BodyworkOperationEnum;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'labor_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  laborPrice: number;

  @Column({
    name: 'material_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  materialPrice: number;

  /** Costo de la pieza cuando la operación es cambiarla. */
  @Column({
    name: 'part_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  partPrice: number;

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  subtotal: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 12,
    default: BodyworkItemStatusEnum.PENDING,
  })
  status: BodyworkItemStatusEnum;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BodyworkOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: BodyworkOrder;
}
