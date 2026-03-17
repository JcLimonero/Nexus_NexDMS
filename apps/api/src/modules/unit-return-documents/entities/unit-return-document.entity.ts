import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UnitReturn } from '../../unit-returns/entities/unit-return.entity';

export enum UnitReturnDocumentStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('unit_return_documents')
@Index(['tenantId'])
@Index(['unitReturnId'])
@Index(['documentType'])
@Index(['status'])
export class UnitReturnDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'unit_return_id', type: 'uuid' })
  unitReturnId: string;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int', default: 0 })
  sizeBytes: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: UnitReturnDocumentStatusEnum,
    default: UnitReturnDocumentStatusEnum.PENDING,
  })
  status: UnitReturnDocumentStatusEnum;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by' })
  validatedBy?: User | null;

  @ManyToOne(() => UnitReturn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_return_id' })
  unitReturn?: UnitReturn;
}
