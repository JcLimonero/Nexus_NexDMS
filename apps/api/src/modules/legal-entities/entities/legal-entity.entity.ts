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

  /**
   * Datos fiscales ante el SAT. Viven aquí y no en la sucursal porque quien
   * está dado de alta es la persona moral; el local solo es punto de atención.
   */
  @Column({ name: 'rfc', type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ name: 'tax_regime', type: 'varchar', length: 10, nullable: true })
  taxRegime: string | null;

  @Column({ name: 'tax_postal_code', type: 'varchar', length: 10, nullable: true })
  taxPostalCode: string | null;

  /** Organización en FacturAPI con la que se timbra a nombre de esta razón social. */
  @Column({ name: 'facturaapi_org_id', type: 'varchar', length: 100, nullable: true })
  facturaapiOrgId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
