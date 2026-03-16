import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contacts')
@Index(['tenantId'])
@Index(['clientId'])
@Index(['phone'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'first_name', type: 'varchar', length: 200 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 200, nullable: true })
  lastName: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'email', type: 'varchar', length: 300, nullable: true })
  email: string | null;

  @Column({ name: 'position', type: 'varchar', length: 200, nullable: true })
  position: string | null;

  @Column({ name: 'department', type: 'varchar', length: 200, nullable: true })
  department: string | null;

  @Column({ name: 'is_authorized', type: 'boolean', default: true })
  isAuthorized: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
