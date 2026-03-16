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
import { CatalogUnit } from '../../catalog-units/entities/catalog-unit.entity';
import { Client } from '../../clients/entities/client.entity';
import { UnitReservation } from '../../unit-reservations/entities/unit-reservation.entity';
import { PaymentPlan } from './payment-plan.entity';
import { UnitSaleAccessory } from '../../unit-accessories/entities/unit-sale-accessory.entity';
import { UnitSaleExtra } from '../../unit-sale-extras/entities/unit-sale-extra.entity';

export enum UnitSaleFinancingTypeEnum {
  CASH = 'CASH',
  AGENCY_CREDIT = 'AGENCY_CREDIT',
  BANK_CREDIT = 'BANK_CREDIT',
}

export enum UnitSaleStatusEnum {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('unit_sales')
@Index(['tenantId'])
@Index(['catalogUnitId'])
@Index(['clientId'])
@Index(['status'])
@Index(['financingType'])
export class UnitSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'catalog_unit_id', type: 'uuid' })
  catalogUnitId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId: string | null;

  @Column({ name: 'folio', type: 'varchar', length: 50 })
  folio: string;

  @Column({ name: 'list_price', type: 'decimal', precision: 12, scale: 2 })
  listPrice: number;

  @Column({ name: 'final_price', type: 'decimal', precision: 12, scale: 2 })
  finalPrice: number;

  @Column({
    name: 'advance_applied',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  advanceApplied: number;

  @Column({
    name: 'down_payment',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  downPayment: number;

  @Column({
    name: 'financing_type',
    type: 'enum',
    enum: UnitSaleFinancingTypeEnum,
  })
  financingType: UnitSaleFinancingTypeEnum;

  @Column({
    name: 'bank_financier',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  bankFinancier: string | null;

  @Column({ name: 'bank_folio', type: 'varchar', length: 100, nullable: true })
  bankFolio: string | null;

  @Column({ name: 'status', type: 'enum', enum: UnitSaleStatusEnum })
  status: UnitSaleStatusEnum;

  @Column({ name: 'cfdi_uuid', type: 'varchar', length: 100, nullable: true })
  cfdiUuid: string | null;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate: Date | null;

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

  @ManyToOne(() => UnitReservation, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: UnitReservation;

  @OneToMany(() => PaymentPlan, (p) => p.unitSale)
  paymentPlans?: PaymentPlan[];

  @OneToMany(() => UnitSaleAccessory, (sa) => sa.unitSale)
  accessories?: UnitSaleAccessory[];

  @OneToMany(() => UnitSaleExtra, (e) => e.unitSale)
  extras?: UnitSaleExtra[];
}
