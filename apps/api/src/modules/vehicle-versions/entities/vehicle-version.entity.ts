import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GlobalBrand } from '../../global-brands/entities/global-brand.entity';
import { VehicleModel } from '../../vehicle-models/entities/vehicle-model.entity';

@Entity('vehicle_versions')
@Index(['brandId', 'modelId', 'year', 'name'], { unique: true })
export class VehicleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => GlobalBrand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand?: GlobalBrand;

  @ManyToOne(() => VehicleModel, (m) => m.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model?: VehicleModel;
}
