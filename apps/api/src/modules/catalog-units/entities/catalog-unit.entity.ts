import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { GlobalModel } from '../../global-models/entities/global-model.entity';
import { UnitLocation } from '../../unit-locations/entities/unit-location.entity';

export enum CatalogUnitVehicleTypeEnum {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
}

export enum CatalogUnitStatusEnum {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('catalog_units')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['serialNumber'], { unique: true })
@Index(['status'])
@Index(['vehicleType'])
export class CatalogUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'global_model_id', type: 'uuid', nullable: true })
  globalModelId: string | null;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: CatalogUnitVehicleTypeEnum,
  })
  vehicleType: CatalogUnitVehicleTypeEnum;

  @Column({ name: 'brand', type: 'varchar', length: 100 })
  brand: string;

  @Column({ name: 'model', type: 'varchar', length: 200 })
  model: string;

  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'version', type: 'varchar', length: 200, nullable: true })
  version: string | null;

  @Column({ name: 'color', type: 'varchar', length: 100 })
  color: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100 })
  serialNumber: string;

  @Column({
    name: 'engine_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  engineNumber: string | null;

  @Column({ name: 'displacement', type: 'int', nullable: true })
  displacement: number | null;

  @Column({ name: 'door_count', type: 'int', nullable: true })
  doorCount: number | null;

  @Column({ name: 'cost_price', type: 'decimal', precision: 12, scale: 2 })
  costPrice: number;

  @Column({ name: 'list_price', type: 'decimal', precision: 12, scale: 2 })
  listPrice: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 12, scale: 2 })
  salePrice: number;

  @Column({ name: 'status', type: 'enum', enum: CatalogUnitStatusEnum })
  status: CatalogUnitStatusEnum;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @Column({ name: 'image_key', type: 'varchar', length: 500, nullable: true })
  imageKey: string | null;

  @Column({ name: 'images_keys', type: 'text', array: true, nullable: true })
  imagesKeys: string[] | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'acquisition_date', type: 'date', nullable: true })
  acquisitionDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => GlobalModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'global_model_id' })
  globalModel?: GlobalModel;

  @ManyToOne(() => UnitLocation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location?: UnitLocation;
}
