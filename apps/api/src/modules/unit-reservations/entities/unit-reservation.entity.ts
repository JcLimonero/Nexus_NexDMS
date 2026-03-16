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

export enum UnitReservationStatusEnum {
  ACTIVE = 'ACTIVE',
  CONVERTED = 'CONVERTED',
  RELEASED = 'RELEASED',
}

@Entity('unit_reservations')
@Index(['tenantId'])
@Index(['catalogUnitId'])
@Index(['clientId'])
@Index(['status'])
export class UnitReservation {
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

  @Column({ name: 'advance_amount', type: 'decimal', precision: 12, scale: 2 })
  advanceAmount: number;

  @Column({ name: 'status', type: 'enum', enum: UnitReservationStatusEnum })
  status: UnitReservationStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'released_by_id', type: 'uuid', nullable: true })
  releasedById: string | null;

  @Column({ name: 'release_reason', type: 'text', nullable: true })
  releaseReason: string | null;

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
}
