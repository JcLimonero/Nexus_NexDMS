import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
@Index(['tenantId'])
@Index(['rfc'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'name', type: 'varchar', length: 300 })
  name: string;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  contactName: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'email', type: 'varchar', length: 300, nullable: true })
  email: string | null;

  @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ name: 'address', type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({
    name: 'payment_terms',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  paymentTerms: string | null;

  @Column({ name: 'credit_days', type: 'int', default: 0 })
  creditDays: number;

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
