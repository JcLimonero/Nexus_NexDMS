import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GlobalBrand } from '../../global-brands/entities/global-brand.entity';
import { VehicleVersion } from '../../vehicle-versions/entities/vehicle-version.entity';

@Entity('vehicle_models')
@Index(['brandId', 'name'], { unique: true })
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => GlobalBrand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand?: GlobalBrand;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => VehicleVersion, (v) => v.model)
  versions?: VehicleVersion[];
}
