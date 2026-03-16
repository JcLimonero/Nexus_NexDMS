import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceType } from './service-type.entity';
import { Part } from '../../parts/entities/part.entity';

@Entity('service_type_parts')
@Index(['serviceTypeId'])
@Index(['partId'])
@Index(['serviceTypeId', 'partId'], { unique: true })
export class ServiceTypePart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'quantity_required', type: 'int' })
  quantityRequired: number;

  @ManyToOne(() => ServiceType, (st) => st.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType?: ServiceType;

  @ManyToOne(() => Part, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;
}
