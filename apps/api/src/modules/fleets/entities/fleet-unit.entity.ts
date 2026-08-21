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
import { FleetAgreement } from './fleet-agreement.entity';

/**
 * Unidad adscrita a un convenio de flotilla. Las unidades entran y salen del
 * acuerdo, así que la adscripción es explícita y no "todos los vehículos del
 * cliente": un vehículo del titular puede quedar fuera del convenio.
 */
@Entity('fleet_units')
@Index(['tenantId'])
@Index(['fleetAgreementId'])
@Index(['vehicleId'])
export class FleetUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'fleet_agreement_id', type: 'uuid' })
  fleetAgreementId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @ManyToOne(() => FleetAgreement, (a) => a.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fleet_agreement_id' })
  agreement?: FleetAgreement;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;
}
