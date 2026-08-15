import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UnitSale } from './unit-sale.entity';

/**
 * Qué representa un pago dentro de la compra de la unidad.
 *
 * No es una mensualidad de crédito —eso es el plan de pago—: es un movimiento
 * real de dinero que se registra según ocurre. Una compra típica encadena un
 * apartado, un enganche y uno o varios parciales hasta liquidar.
 */
export enum UnitSalePaymentKindEnum {
  APARTADO = 'APARTADO',
  ENGANCHE = 'ENGANCHE',
  PARCIAL = 'PARCIAL',
  LIQUIDACION = 'LIQUIDACION',
}

/** Forma en que se recibió el pago. */
export enum UnitSalePaymentMethodEnum {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

/**
 * Un pago registrado contra la venta de una unidad.
 *
 * El comprobante puede llegar después —el asesor registra el pago cuando
 * entra el dinero y adjunta el recibo cuando lo tiene a la mano—, por eso el
 * archivo es opcional. Pero la venta no se cierra hasta que todos los pagos
 * tengan su comprobante guardado.
 */
@Entity('unit_sale_payments')
@Index(['unitSaleId'])
export class UnitSalePayment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'unit_sale_id', type: 'uuid' })
  unitSaleId: string;

  @Column({ name: 'kind', type: 'varchar', length: 20 })
  kind: UnitSalePaymentKindEnum;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'method', type: 'varchar', length: 20 })
  method: UnitSalePaymentMethodEnum;

  @Column({ name: 'reference', type: 'varchar', length: 120, nullable: true })
  reference: string | null;

  @Column({ name: 'paid_date', type: 'date' })
  paidDate: string;

  @Column({ name: 'notes', type: 'varchar', length: 300, nullable: true })
  notes: string | null;

  // ── Comprobante (opcional al registrar, exigido para cerrar) ──
  @Column({
    name: 'receipt_storage_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  receiptStorageKey: string | null;

  @Column({
    name: 'receipt_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  receiptName: string | null;

  @Column({
    name: 'receipt_mime',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  receiptMime: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UnitSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;
}
