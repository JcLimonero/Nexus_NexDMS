import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleType } from '../../vehicle-types/entities/vehicle-type.entity';
import { CombustionType } from '../../combustion-types/entities/combustion-type.entity';

@Entity('global_models')
@Index(['brandName'])
@Index(['vehicleTypeId'])
@Index(['combustionTypeId'])
export class GlobalModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_name', type: 'varchar', length: 100 })
  brandName: string;

  @Column({ name: 'vehicle_type_id', type: 'uuid' })
  vehicleTypeId: string;

  @ManyToOne(() => VehicleType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_type_id' })
  vehicleType?: VehicleType;

  @Column({ name: 'model', type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'version', type: 'varchar', length: 100, nullable: true })
  version: string | null;

  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'combustion_type_id', type: 'uuid', nullable: true })
  combustionTypeId: string | null;

  @ManyToOne(() => CombustionType, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'combustion_type_id' })
  combustionType?: CombustionType | null;

  @Column({ name: 'displacement', type: 'int', nullable: true })
  displacement: number | null;

  @Column({ name: 'door_count', type: 'int', nullable: true })
  doorCount: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
