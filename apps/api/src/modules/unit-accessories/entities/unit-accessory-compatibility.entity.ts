import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UnitAccessory } from './unit-accessory.entity';
import { GlobalModel } from '../../global-models/entities/global-model.entity';

@Entity('unit_accessory_compatibilities')
@Index(['accessoryId', 'globalModelId'], { unique: true })
@Index(['accessoryId'])
@Index(['globalModelId'])
export class UnitAccessoryCompatibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'accessory_id', type: 'uuid' })
  accessoryId: string;

  @Column({ name: 'global_model_id', type: 'uuid' })
  globalModelId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UnitAccessory, (a) => a.compatibilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accessory_id' })
  accessory?: UnitAccessory;

  @ManyToOne(() => GlobalModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'global_model_id' })
  globalModel?: GlobalModel;
}
