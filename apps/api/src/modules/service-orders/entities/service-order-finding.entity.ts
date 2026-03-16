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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, (so) => so.findings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
