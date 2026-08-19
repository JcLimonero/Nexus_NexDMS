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

/**
 * De dónde se cumple un requisito de documento.
 *
 * CLIENT: con un documento del expediente del cliente (`client_documents`),
 * reutilizable entre sus compras —el INE es el mismo se venda lo que se venda—.
 * SALE: con uno subido a esta venta, propio de la operación —el contrato, el
 * comprobante de ingresos de ESTE crédito—.
 */
export enum SaleDocumentScopeEnum {
  CLIENT = 'CLIENT',
  SALE = 'SALE',
}

export enum SaleDocumentStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Catálogo de tipos de documento del tenant, editable. */
@Entity('sale_document_types')
@Index(['tenantId'])
export class SaleDocumentType {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  /** Clave estable; en los de ámbito cliente liga con `client_documents`. */
  @Column({ name: 'key', type: 'varchar', length: 60 })
  key: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'scope', type: 'varchar', length: 10 })
  scope: SaleDocumentScopeEnum;

  /** Si el documento caduca; la fecha real va en cada archivo subido. */
  @Column({ name: 'has_expiration', type: 'boolean', default: false })
  hasExpiration: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/**
 * Una regla de la matriz: qué documento exige una combinación.
 *
 * Cada eje admite null = "cualquiera": el INE se pide con una sola fila (los
 * tres ejes vacíos) y el comprobante de ingresos con dos (una por cada tipo de
 * crédito), en vez de repetir la regla por cada tipo de vehículo.
 */
@Entity('sale_document_rules')
@Index(['tenantId'])
export class SaleDocumentRule {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'document_type_id', type: 'uuid' })
  documentTypeId: string;

  @Column({ name: 'client_type', type: 'varchar', length: 20, nullable: true })
  clientType: string | null;

  @Column({
    name: 'financing_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  financingType: string | null;

  /** Categoría de vehículo (MOTO/AUTO); null = cualquiera. */
  @Column({
    name: 'vehicle_category',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  vehicleCategory: string | null;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SaleDocumentType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_type_id' })
  documentType?: SaleDocumentType;
}

/** Un documento subido a una venta concreta (ámbito SALE). */
@Entity('sale_documents')
@Index(['unitSaleId'])
export class SaleDocument {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'unit_sale_id', type: 'uuid' })
  unitSaleId: string;

  @Column({ name: 'document_type_id', type: 'uuid' })
  documentTypeId: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int', default: 0 })
  sizeBytes: number;

  @Column({ name: 'status', type: 'varchar', length: 12, default: 'PENDING' })
  status: SaleDocumentStatusEnum;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: string | null;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  rejectionReason: string | null;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SaleDocumentType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_type_id' })
  documentType?: SaleDocumentType;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by' })
  validatedBy?: User | null;
}
