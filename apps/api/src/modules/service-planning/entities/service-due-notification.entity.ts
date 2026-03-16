import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerVehicle } from '../../customer-vehicles/entities/customer-vehicle.entity';
import { ServiceType } from '../../service-types/entities/service-type.entity';

@Entity('service_due_notifications')
@Index(['vehicleId', 'serviceTypeId'])
@Index(['notifiedAt'])
export class ServiceDueNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId: string;

  @Column({
    name: 'notified_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  notifiedAt: Date;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;

  @ManyToOne(() => ServiceType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType?: ServiceType;
}
