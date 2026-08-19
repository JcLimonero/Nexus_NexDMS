import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatalogUnit } from '../../catalog-units/entities/catalog-unit.entity';
import { Part } from '../../parts/entities/part.entity';
import { Quotation } from './quotation.entity';
import { QuotationItemPhoto } from './quotation-item-photo.entity';

/**
 * Decisión del cliente sobre cada línea del presupuesto (autorización parcial).
 *
 * El cliente ya no acepta o rechaza el presupuesto completo: decide trabajo
 * por trabajo desde la liga pública. `CALLBACK` es el "que me llamen" —ni sí
 * ni no, quiere que el asesor lo contacte antes de decidir.
 */
export enum QuotationLineStatusEnum {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CALLBACK = 'CALLBACK',
}

/** Urgencia del trabajo, tal como la ve el cliente (los badges de Ricardo). */
export enum QuotationLineUrgencyEnum {
  URGENTE = 'URGENTE',
  RECOMENDADO = 'RECOMENDADO',
  OPCIONAL = 'OPCIONAL',
}

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

  // ── Autorización parcial por línea (R1) ──

  @Column({
    name: 'line_status',
    type: 'enum',
    enum: QuotationLineStatusEnum,
    default: QuotationLineStatusEnum.PENDING,
  })
  lineStatus: QuotationLineStatusEnum;

  @Column({
    name: 'urgency',
    type: 'enum',
    enum: QuotationLineUrgencyEnum,
    default: QuotationLineUrgencyEnum.RECOMENDADO,
  })
  urgency: QuotationLineUrgencyEnum;

  /** Nota del técnico para el cliente sobre esta línea. */
  @Column({ name: 'technician_note', type: 'text', nullable: true })
  technicianNote: string | null;

  /** Comentario que el cliente deja al responder esta línea, si lo hay. */
  @Column({ name: 'client_line_note', type: 'text', nullable: true })
  clientLineNote: string | null;

  @ManyToOne(() => Quotation, (q) => q.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation?: Quotation;

  @ManyToOne(() => Part, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'part_id' })
  part?: Part;

  @ManyToOne(() => CatalogUnit, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'catalog_unit_id' })
  catalogUnit?: CatalogUnit;

  /** Fotos de lo que se recomienda cambiar, para que el cliente lo vea. */
  @OneToMany(() => QuotationItemPhoto, (p) => p.item)
  photos?: QuotationItemPhoto[];

  // ── Trabajo → refacciones (R1 v2) ──
  // Un ítem "trabajo" es padre (parentItemId null) y lleva la mano de obra;
  // sus refacciones son ítems hijos que lo apuntan.

  @Column({ name: 'parent_item_id', type: 'uuid', nullable: true })
  parentItemId: string | null;

  @ManyToOne(() => QuotationItem, (i) => i.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_item_id' })
  parent?: QuotationItem;

  /** Refacciones que cuelgan de este trabajo. */
  @OneToMany(() => QuotationItem, (i) => i.parent)
  children?: QuotationItem[];
}
