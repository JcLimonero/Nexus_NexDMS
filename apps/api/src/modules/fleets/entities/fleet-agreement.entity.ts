import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { FleetUnit } from './fleet-unit.entity';

const pct = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};

/**
 * Convenio de flotilla: el acuerdo comercial de una empresa que trae varias
 * unidades a servicio o compra refacciones con precio preferencial.
 *
 * El descuento se puede definir de dos formas (ambas conviven): una lista de
 * precios para refacciones (con overrides por pieza) o, si no hay lista, un
 * porcentaje. La mano de obra y la venta de unidades llevan su propio
 * porcentaje. Solo las unidades adscritas ({@link FleetUnit}) reciben el precio
 * de convenio en el taller; en mostrador y venta de unidad manda el cliente.
 */
@Entity('fleet_agreements')
@Index(['tenantId'])
@Index(['clientId'])
export class FleetAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  /** Empresa titular del convenio (un Client, normalmente BUSINESS). */
  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  /** Número de convenio (referencia comercial), único por tenant. */
  @Column({ name: 'agreement_number', type: 'varchar', length: 40 })
  agreementNumber: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name: string;

  // ── Descuento en refacciones: lista de precios o, si no, un % ──
  @Column({ name: 'parts_price_list_id', type: 'uuid', nullable: true })
  partsPriceListId: string | null;

  @Column({
    name: 'parts_discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: pct,
  })
  partsDiscountPct: number | null;

  // ── Descuento en mano de obra y en venta de unidades ──
  @Column({
    name: 'labor_discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: pct,
  })
  laborDiscountPct: number | null;

  @Column({
    name: 'unit_sale_discount_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: pct,
  })
  unitSaleDiscountPct: number | null;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: string | null;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @OneToMany(() => FleetUnit, (u) => u.agreement)
  units?: FleetUnit[];
}
