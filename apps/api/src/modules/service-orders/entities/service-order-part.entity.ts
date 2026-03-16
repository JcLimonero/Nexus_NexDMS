import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Part } from '../../parts/entities/part.entity';
import { ServiceOrder } from './service-order.entity';

@Entity('service_order_parts')
export class ServiceOrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => ServiceOrder, (so) => so.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => Part, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;
}
