import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../../vehicle-types/entities/vehicle-type.entity';

@Entity('vehicle_categories')
@Index(['code'], { unique: true })
export class VehicleCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'label', type: 'varchar', length: 50 })
  label: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => VehicleType, (vt) => vt.category)
  vehicleTypes?: VehicleType[];
}
