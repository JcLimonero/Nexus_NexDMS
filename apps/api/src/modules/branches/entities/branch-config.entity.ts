import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('branch_config')
@Index(['branchId'], { unique: true })
export class BranchConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'whatsapp_phone_id', type: 'text', nullable: true })
  whatsappPhoneId: string | null;

  @Column({ name: 'whatsapp_token', type: 'text', nullable: true })
  whatsappToken: string | null;

  @Column({ name: 'facturaapi_api_key', type: 'text', nullable: true })
  facturaapiApiKey: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_clabe', type: 'varchar', length: 18, nullable: true })
  bankClabe: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 20, nullable: true })
  bankAccount: string | null;

  @Column({ name: 'bank_holder', type: 'varchar', length: 300, nullable: true })
  bankHolder: string | null;

  @Column({ name: 'cfdi_last_folio', type: 'int', default: 0 })
  cfdiLastFolio: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
