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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { ServiceTypePart } from './service-type-part.entity';

export enum ServiceTypeCategoryEnum {
  MAINTENANCE = 'MAINTENANCE',
  REVISION = 'REVISION',
  DIAGNOSIS = 'DIAGNOSIS',
  REPAIR = 'REPAIR',
  OTHER = 'OTHER',
}

@Entity('service_types')
@Index(['tenantId'])
@Index(['branchId'])
@Index(['category'])
export class ServiceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'category',
    type: 'enum',
    enum: ServiceTypeCategoryEnum,
  })
  category: ServiceTypeCategoryEnum;

  @Column({ name: 'duration_min', type: 'int', default: 60 })
  durationMin: number;

  @Column({ name: 'requires_ramp', type: 'boolean', default: false })
  requiresRamp: boolean;

  @Column({ name: 'ramp_duration_min', type: 'int', nullable: true })
  rampDurationMin: number | null;

  @Column({
    name: 'schedulable_days',
    type: 'smallint',
    array: true,
    nullable: true,
  })
  schedulableDays: number[] | null;

  @Column({
    name: 'recurrence_km_interval',
    type: 'int',
    nullable: true,
  })
  recurrenceKmInterval: number | null;

  @Column({
    name: 'recurrence_months_interval',
    type: 'int',
    nullable: true,
  })
  recurrenceMonthsInterval: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @OneToMany(() => ServiceTypePart, (stp) => stp.serviceType)
  parts?: ServiceTypePart[];
}
