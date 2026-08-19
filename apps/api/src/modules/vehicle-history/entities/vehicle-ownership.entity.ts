import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerVehicle } from '../../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../../clients/entities/client.entity';

/** De dónde salió el cambio de dueño, para poder rastrearlo. */
export enum OwnershipSourceEnum {
  ALTA = 'ALTA',
  MANUAL = 'MANUAL',
  VENTA = 'VENTA',
}

/**
 * Un tramo de la vida del vehículo con un dueño.
 *
 * `toDate = null` es el dueño de hoy, y un índice único lo garantiza: dos
 * tramos abiertos a la vez significarían un traspaso a medias, y el historial
 * se contradiría solo.
 */
@Entity('vehicle_ownerships')
@Index(['vehicleId', 'fromDate'])
@Index(['clientId'])
export class VehicleOwnership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'from_date', type: 'date' })
  fromDate: string;

  /** null = lo tiene ahora. */
  @Column({ name: 'to_date', type: 'date', nullable: true })
  toDate: string | null;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 30,
    default: OwnershipSourceEnum.MANUAL,
  })
  source: OwnershipSourceEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}
