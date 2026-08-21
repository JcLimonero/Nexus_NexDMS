import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BodyworkOrder } from './bodywork-order.entity';

/**
 * Foto del daño de una orden de carrocería. Puede colgar de la orden en
 * general o de una pieza concreta ({@link BodyworkItem}) para documentar ese
 * daño en particular. El archivo vive en el storage privado; aquí solo la key.
 */
@Entity('bodywork_photos')
@Index(['tenantId'])
@Index(['orderId'])
export class BodyworkPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  /** Pieza a la que pertenece la foto (opcional). */
  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 300 })
  storageKey: string;

  @Column({ name: 'caption', type: 'varchar', length: 200, nullable: true })
  caption: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => BodyworkOrder, (o) => o.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: BodyworkOrder;
}
