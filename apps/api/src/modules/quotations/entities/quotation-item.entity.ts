import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatalogUnit } from '../../catalog-units/entities/catalog-unit.entity';
import { Part } from '../../parts/entities/part.entity';
import { Quotation } from './quotation.entity';

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quotation_id', type: 'uuid' })
  quotationId: string;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @Column({ name: 'catalog_unit_id', type: 'uuid', nullable: true })
  catalogUnitId: string | null;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({
    name: 'discount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Quotation, (q) => q.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation?: Quotation;

  @ManyToOne(() => Part, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;

  @ManyToOne(() => CatalogUnit, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'catalog_unit_id' })
  catalogUnit?: CatalogUnit;
}
