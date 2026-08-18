import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PartVehicleTypeEnum {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  BOTH = 'BOTH',
}

@Entity('parts')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['branchId', 'sku'], { unique: true })
@Index(['sku'])
@Index(['barcode'])
@Index(['vehicleType'])
@Index(['locationId'])
export class Part {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @Column({ name: 'sku', type: 'varchar', length: 100 })
  sku: string;

  @Column({ name: 'barcode', type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ name: 'name', type: 'varchar', length: 300 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'vehicle_type', type: 'enum', enum: PartVehicleTypeEnum })
  vehicleType: PartVehicleTypeEnum;

  @Column({
    name: 'compatible_makes',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  compatibleMakes: string | null;

  @Column({
    name: 'unit_of_measure',
    type: 'varchar',
    length: 50,
    default: 'PIECE',
  })
  unitOfMeasure: string;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 12, scale: 2 })
  purchasePrice: number;

  /**
   * Costo promedio ponderado. Se recalcula en cada entrada de compra y es la
   * base para valuar el inventario, en vez del último precio de compra.
   */
  @Column({
    name: 'average_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  averageCost: number;

  @Column({ name: 'public_price', type: 'decimal', precision: 12, scale: 2 })
  publicPrice: number;

  @Column({ name: 'wholesale_price', type: 'decimal', precision: 12, scale: 2 })
  wholesalePrice: number;

  @Column({ name: 'business_price', type: 'decimal', precision: 12, scale: 2 })
  businessPrice: number;

  @Column({
    name: 'max_discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10,
  })
  maxDiscountPct: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ name: 'min_stock', type: 'int', default: 1 })
  minStock: number;

  @Column({ name: 'max_stock', type: 'int', nullable: true })
  maxStock: number | null;

  @Column({ name: 'image_key', type: 'varchar', length: 500, nullable: true })
  imageKey: string | null;

  /** Proveedor principal (para requisiciones y sugerencias de compra). */
  @Column({ name: 'preferred_supplier_id', type: 'uuid', nullable: true })
  preferredSupplierId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
