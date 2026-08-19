import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleCategory } from '../../vehicle-categories/entities/vehicle-category.entity';

@Entity('vehicle_types')
@Index(['code'], { unique: true })
@Index(['categoryId'])
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => VehicleCategory, (c) => c.vehicleTypes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: VehicleCategory;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'label', type: 'varchar', length: 100 })
  label: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
