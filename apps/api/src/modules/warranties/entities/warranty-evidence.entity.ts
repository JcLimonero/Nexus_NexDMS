import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Warranty } from './warranty.entity';

export enum WarrantyEvidenceKindEnum {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}

/**
 * Evidencia (foto o video) de una reclamación de garantía.
 *
 * Es lo que sustenta la decisión de autorizar, rechazar o resolver: el daño o
 * la falla capturados por el asesor. El archivo vive en el almacenamiento
 * (B2/S3) y aquí queda su llave y metadatos; se sirve por URL firmada.
 */
@Entity('warranty_evidence')
@Index(['tenantId'])
@Index(['warrantyId'])
export class WarrantyEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'warranty_id', type: 'uuid' })
  warrantyId: string;

  @Column({ name: 'kind', type: 'varchar', length: 10 })
  kind: WarrantyEvidenceKindEnum;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ name: 'content_type', type: 'varchar', length: 120, nullable: true })
  contentType: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 300, nullable: true })
  fileName: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number | null;

  @Column({ name: 'caption', type: 'varchar', length: 300, nullable: true })
  caption: string | null;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Warranty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warranty_id' })
  warranty?: Warranty;
}
