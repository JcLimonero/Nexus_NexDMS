import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';
import { MechanicChecklistItem } from './mechanic-checklist-item.entity';
import { User } from '../../users/entities/user.entity';

export enum MechanicSafetyChecklistStatusEnum {
  BUENO = 'BUENO',
  REGULAR = 'REGULAR',
  MALO = 'MALO',
  REEMPLAZAR = 'REEMPLAZAR',
  OK = 'OK',
  FALLA = 'FALLA',
}

@Entity('mechanic_safety_checklists')
export class MechanicSafetyChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MechanicSafetyChecklistStatusEnum,
  })
  status: MechanicSafetyChecklistStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'photo_key', type: 'varchar', length: 500, nullable: true })
  photoKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => MechanicChecklistItem, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'item_id' })
  item?: MechanicChecklistItem;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
