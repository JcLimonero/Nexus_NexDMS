import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LegalEntityTypeEnum {
  MOTO = 'MOTO',
  AUTO = 'AUTO',
  BOTH = 'BOTH',
}

@Entity('legal_entities')
@Index(['tenantId'])
export class LegalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ name: 'type', type: 'enum', enum: LegalEntityTypeEnum })
  type: LegalEntityTypeEnum;

  @Column({ name: 'logo_key', type: 'varchar', length: 500, nullable: true })
  logoKey: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
