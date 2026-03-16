import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleTypeEnum {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
}

@Entity('customer_vehicles')
@Index(['tenantId'])
@Index(['ownerId'])
@Index(['vin'])
@Index(['plate'])
export class CustomerVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleTypeEnum })
  vehicleType: VehicleTypeEnum;

  @Column({ name: 'make', type: 'varchar', length: 100 })
  make: string;

  @Column({ name: 'model', type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'color', type: 'varchar', length: 100, nullable: true })
  color: string | null;

  @Column({ name: 'plate', type: 'varchar', length: 20, nullable: true })
  plate: string | null;

  @Column({ name: 'vin', type: 'varchar', length: 100, nullable: true })
  vin: string | null;

  @Column({
    name: 'engine_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  engineNumber: string | null;

  @Column({ name: 'mileage', type: 'int', default: 0 })
  mileage: number;

  @Column({ name: 'assigned_contact_id', type: 'uuid', nullable: true })
  assignedContactId: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
