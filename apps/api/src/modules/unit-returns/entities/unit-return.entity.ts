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
import { CatalogUnit } from '../../catalog-units/entities/catalog-unit.entity';
import { Client } from '../../clients/entities/client.entity';
import { UnitSale } from '../../unit-sales/entities/unit-sale.entity';

@Entity('unit_returns')
@Index(['tenantId'])
@Index(['catalogUnitId'])
@Index(['clientId'])
export class UnitReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'catalog_unit_id', type: 'uuid' })
  catalogUnitId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'unit_sale_id', type: 'uuid', nullable: true })
  unitSaleId: string | null;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: Date;

  @Column({ name: 'buyback_price', type: 'decimal', precision: 12, scale: 2 })
  buybackPrice: number;

  @Column({ name: 'mileage', type: 'int', nullable: true })
  mileage: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CatalogUnit, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'catalog_unit_id' })
  catalogUnit?: CatalogUnit;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @ManyToOne(() => UnitSale, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;
}
