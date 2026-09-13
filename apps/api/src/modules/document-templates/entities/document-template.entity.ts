import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Plantilla de documento editable por el cliente (HTML del editor). Genérica por
 * `templateKey` para reutilizarse en varios documentos.
 */
@Entity('document_templates')
@Unique(['tenantId', 'templateKey'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  /** Clave del documento: p. ej. `contract-unit-sale`. */
  @Column({ name: 'template_key', type: 'varchar', length: 60 })
  templateKey: string;

  @Column({ name: 'html', type: 'text', default: '' })
  html: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
