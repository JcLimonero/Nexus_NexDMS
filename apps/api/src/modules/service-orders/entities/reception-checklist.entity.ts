import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceptionPhoto } from './reception-photo.entity';
import { User } from '../../users/entities/user.entity';
import { ServiceOrder } from './service-order.entity';

@Entity('reception_checklists')
export class ReceptionChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_order_id', type: 'uuid', unique: true })
  serviceOrderId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'fuel_level', type: 'int' })
  fuelLevel: number;

  @Column({ name: 'km_in', type: 'int' })
  kmIn: number;

  @Column({ name: 'has_spare_tire', type: 'boolean', default: false })
  hasSpareTire: boolean;

  @Column({ name: 'has_tools', type: 'boolean', default: false })
  hasTools: boolean;

  @Column({ name: 'has_documents', type: 'boolean', default: false })
  hasDocuments: boolean;

  @Column({ name: 'has_mats', type: 'boolean', default: false })
  hasMats: boolean;

  @Column({ name: 'observations', type: 'text', nullable: true })
  observations: string | null;

  @Column({ name: 'damage_description', type: 'text', nullable: true })
  damageDescription: string | null;

  @Column({
    name: 'client_signature_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  clientSignatureKey: string | null;

  @Column({ name: 'photos_keys', type: 'text', array: true, nullable: true })
  photosKeys: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => ServiceOrder, (so) => so.checklist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => ReceptionPhoto, (p) => p.receptionChecklist)
  photos?: ReceptionPhoto[];
}
