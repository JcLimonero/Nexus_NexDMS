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
import { VehicleVersion } from '../../vehicle-versions/entities/vehicle-version.entity';

export type VehicleColorType = 'INTERIOR' | 'EXTERIOR';

@Entity('vehicle_colors')
@Index(['brandId', 'modelId', 'versionId', 'name', 'colorType'], {
  unique: true,
})
export class VehicleColor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'color_type', type: 'varchar', length: 20 })
  colorType: VehicleColorType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => GlobalBrand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand?: GlobalBrand;

  @ManyToOne(() => VehicleModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model?: VehicleModel;

  @ManyToOne(() => VehicleVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version?: VehicleVersion;
}
