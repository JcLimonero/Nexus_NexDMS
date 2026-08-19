import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Número de parte alterno que refiere a la misma refacción. */
@Entity('part_equivalences')
@Index(['tenantId', 'equivalentSku'])
@Index(['partId', 'equivalentSku'], { unique: true })
export class PartEquivalence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'equivalent_sku', type: 'varchar', length: 100 })
  equivalentSku: string;

  @Column({ name: 'brand', type: 'varchar', length: 120, nullable: true })
  brand: string | null;

  @Column({ name: 'note', type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
