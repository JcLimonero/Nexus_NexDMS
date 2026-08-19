import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UnitAccessoryCompatibility } from './unit-accessory-compatibility.entity';

@Entity('unit_accessories')
@Index(['tenantId'])
@Index(['sku'])
export class UnitAccessory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({
    name: 'sat_product_key',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  satProductKey: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  /**
   * Monta en cualquier unidad. Se marca a propósito y no se deduce de "sin
   * modelos": sin filas también puede significar que nadie las ha capturado.
   */
  @Column({ name: 'is_universal', type: 'boolean', default: false })
  isUniversal: boolean;

  /** Familia por la que se recorre el catálogo: tapetes, barras, cascos. */
  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UnitAccessoryCompatibility, (c) => c.accessory)
  compatibilities?: UnitAccessoryCompatibility[];
}
