import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceptionPhoto } from './reception-photo.entity';

/**
 * Foto que se debe tomar al recibir una unidad.
 *
 * `tenantId = null` marca el set de fábrica: aplica mientras el cliente no
 * defina el suyo, así que un tenant nuevo ya opera sin configurar nada.
 * `vehicleTypes = null` significa que la foto aplica a cualquier vehículo
 * (una moto no tiene cajuela ni interior, de ahí la distinción).
 */
@Entity('reception_photo_specs')
@Index(['tenantId', 'isActive'])
export class ReceptionPhotoSpec {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'code', type: 'varchar', length: 40 }) code: string;
  @Column({ name: 'name', type: 'varchar', length: 120 }) name: string;

  @Column({ name: 'hint', type: 'varchar', length: 300, nullable: true })
  hint: string | null;

  @Column({ name: 'vehicle_types', type: 'text', array: true, nullable: true })
  vehicleTypes: string[] | null;

  @Column({ name: 'required', type: 'boolean', default: true })
  required: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

export enum ReceptionMarkTypeEnum {
  SCRATCH = 'SCRATCH',
  DENT = 'DENT',
  BROKEN = 'BROKEN',
  MISSING = 'MISSING',
  WEAR = 'WEAR',
  OTHER = 'OTHER',
}

export enum ReceptionMarkShapeEnum {
  /** Un sitio concreto: un rayón, una piedra en el parabrisas. */
  POINT = 'POINT',
  /** Una zona: el cuarto de tapa raspado, el faro estrellado. */
  CIRCLE = 'CIRCLE',
}

/**
 * Marca sobre una foto de recepción.
 *
 * Las coordenadas son relativas (0–1) al ancho y alto de la imagen: así el
 * marcador cae en el mismo punto sin importar el tamaño con que se muestre.
 * El radio, en cambio, es relativo solo al ancho, para que el círculo salga
 * redondo y no un óvalo distinto en cada pantalla.
 */
@Entity('reception_photo_marks')
@Index(['receptionPhotoId'])
export class ReceptionPhotoMark {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'reception_photo_id', type: 'uuid' })
  receptionPhotoId: string;

  @Column({ name: 'mark_type', type: 'varchar', length: 30 })
  markType: ReceptionMarkTypeEnum;

  @Column({
    name: 'shape',
    type: 'varchar',
    length: 10,
    default: ReceptionMarkShapeEnum.POINT,
  })
  shape: ReceptionMarkShapeEnum;

  @Column({ name: 'note', type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ name: 'x', type: 'numeric', precision: 5, scale: 4 })
  x: string;

  @Column({ name: 'y', type: 'numeric', precision: 5, scale: 4 })
  y: string;

  /** Nulo en un punto; en un círculo, su radio sobre el ancho de la imagen. */
  @Column({ name: 'radius', type: 'numeric', precision: 5, scale: 4, nullable: true })
  radius: string | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => ReceptionPhoto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reception_photo_id' })
  photo?: ReceptionPhoto;
}
