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
import { Branch } from '../../branches/entities/branch.entity';
import { Client } from '../../clients/entities/client.entity';
import { CustomerVehicle } from '../../customer-vehicles/entities/customer-vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';
import { UnitSale } from '../../unit-sales/entities/unit-sale.entity';

export enum WarrantyTypeEnum {
  UNIT = 'UNIT',
  PART = 'PART',
  SERVICE = 'SERVICE',
}

export enum WarrantyStatusEnum {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity('warranties')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['status'])
@Index(['clientId'])
@Index(['createdAt'])
export class Warranty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'unit_sale_id', type: 'uuid', nullable: true })
  unitSaleId: string | null;

  @Column({ name: 'service_order_id', type: 'uuid', nullable: true })
  serviceOrderId: string | null;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'authorizer_id', type: 'uuid', nullable: true })
  authorizerId: string | null;

  @Column({ name: 'type', type: 'enum', enum: WarrantyTypeEnum })
  type: WarrantyTypeEnum;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'status', type: 'enum', enum: WarrantyStatusEnum })
  status: WarrantyStatusEnum;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'new_service_order_id', type: 'uuid', nullable: true })
  newServiceOrderId: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => UnitSale, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'unit_sale_id' })
  unitSale?: UnitSale;

  @ManyToOne(() => ServiceOrder, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;

  @ManyToOne(() => Client, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @ManyToOne(() => CustomerVehicle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: CustomerVehicle;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'authorizer_id' })
  authorizer?: User;

  @ManyToOne(() => ServiceOrder, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'new_service_order_id' })
  newServiceOrder?: ServiceOrder;
}
