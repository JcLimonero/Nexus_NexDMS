import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';

/**
 * Las tres firmas que lleva una orden de servicio. Van separadas porque
 * significan cosas distintas: autorizar el gasto no es lo mismo que dar
 * la unidad por recibida conforme.
 */
export enum SignatureKindEnum {
  /** El cliente autoriza el presupuesto. */
  CLIENT_QUOTE = 'CLIENT_QUOTE',
  /** El cliente da su conformidad con el estado de la unidad. */
  CLIENT_CONFORME = 'CLIENT_CONFORME',
  /** El asesor que recibe. */
  ADVISOR = 'ADVISOR',
}

export const SIGNATURE_KIND_LABELS: Record<SignatureKindEnum, string> = {
  [SignatureKindEnum.CLIENT_QUOTE]: 'Cliente — acepta presupuesto',
  [SignatureKindEnum.CLIENT_CONFORME]: 'Cliente — conforme',
  [SignatureKindEnum.ADVISOR]: 'Asesor de servicio',
};

export enum SignatureModeEnum {
  /** Se firma en el mostrador, sobre la pantalla del asesor. */
  PRESENCIAL = 'PRESENCIAL',
  /** Se manda un enlace y el cliente firma desde su teléfono. */
  REMOTA = 'REMOTA',
}

@Entity('document_signatures')
export class DocumentSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'kind', type: 'varchar', length: 30 })
  kind: SignatureKindEnum;

  @Column({
    name: 'mode',
    type: 'varchar',
    length: 20,
    default: SignatureModeEnum.PRESENCIAL,
  })
  mode: SignatureModeEnum;

  @Column({ name: 'signer_name', type: 'varchar', length: 200, nullable: true })
  signerName: string | null;

  /** Trazo de la firma en almacenamiento; null mientras esté pendiente. */
  @Column({ name: 'image_key', type: 'varchar', length: 500, nullable: true })
  imageKey: string | null;

  /** Solo para firma remota: es la llave del enlace que recibe el cliente. */
  @Column({ name: 'token', type: 'varchar', length: 64, nullable: true })
  token: string | null;

  @Column({ name: 'requested_at', type: 'timestamp', nullable: true })
  requestedAt: Date | null;

  @Column({ name: 'signed_at', type: 'timestamp', nullable: true })
  signedAt: Date | null;

  /** Se registra para poder sostener la firma si alguien la disputa. */
  @Column({ name: 'signer_ip', type: 'varchar', length: 64, nullable: true })
  signerIp: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder?: ServiceOrder;
}
