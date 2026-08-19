import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Historial de precio de una refacción por proveedor. Se alimenta al recibir
 * órdenes de compra; es la base del "top 3 de proveedores" para comparar.
 */
@Entity('part_suppliers')
@Index(['tenantId'])
@Index(['partId', 'supplierId'], { unique: true })
export class PartSupplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'supplier_sku', type: 'varchar', length: 100, nullable: true })
  supplierSku: string | null;

  @Column({ name: 'last_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lastPrice: number;

  @Column({ name: 'last_purchased_at', type: 'date', nullable: true })
  lastPurchasedAt: string | null;

  @Column({ name: 'times_purchased', type: 'int', default: 0 })
  timesPurchased: number;

  /** Garantía que el proveedor otorga sobre esta refacción (meses). */
  @Column({ name: 'warranty_months', type: 'int', nullable: true })
  warrantyMonths: number | null;

  @Column({ name: 'warranty_note', type: 'varchar', length: 300, nullable: true })
  warrantyNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
