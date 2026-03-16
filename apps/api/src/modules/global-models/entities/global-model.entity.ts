import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum VehicleTypeEnum {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
}

@Entity('global_models')
@Index(['brandName'])
@Index(['vehicleType'])
export class GlobalModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 100 })
  brandName: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleTypeEnum })
  vehicleType: VehicleTypeEnum;

  @Column({ name: 'model', type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'year_start', type: 'int' })
  yearStart: number;

  @Column({ name: 'year_end', type: 'int', nullable: true })
  yearEnd: number | null;

  @Column({ name: 'displacement', type: 'int', nullable: true })
  displacement: number | null;

  @Column({ name: 'door_count', type: 'int', nullable: true })
  doorCount: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
