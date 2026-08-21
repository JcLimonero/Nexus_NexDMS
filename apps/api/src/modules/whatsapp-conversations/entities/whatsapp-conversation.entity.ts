import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';

/** En qué acabó —o va— la conversación. */
export enum WhatsappConversationStateEnum {
  /** El asistente la está atendiendo. */
  BOT = 'BOT',
  /** Alguien del taller la tomó y sigue abierta. */
  WITH_AGENT = 'WITH_AGENT',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  /** El cliente dejó de contestar. */
  EXPIRED = 'EXPIRED',
}

/**
 * Por qué dejó de contestar el asistente y entró una persona.
 *
 * Es el dato más útil de toda la pantalla: si la mayoría escala por
 * `BOT_LOOPED`, el problema es el asistente y no la carga de trabajo.
 */
export enum WhatsappEscalationReasonEnum {
  ASKED_FOR_HUMAN = 'ASKED_FOR_HUMAN',
  BOT_LOOPED = 'BOT_LOOPED',
  BOT_WAS_WRONG = 'BOT_WAS_WRONG',
}

@Entity('whatsapp_conversations')
@Index(['tenantId'])
@Index(['branchId', 'lastMessageAt'])
export class WhatsappConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  /** Se llena cuando el teléfono coincide con un cliente ya registrado. */
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  /** Sólo dígitos, como lo manda Meta. El enmascarado es cosa de la UI. */
  @Column({ name: 'phone', type: 'varchar', length: 30 })
  phone: string;

  /** Nombre del perfil de WhatsApp, o el que dio el cliente al agendar. */
  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  contactName: string | null;

  @Column({
    name: 'state',
    type: 'varchar',
    length: 20,
    default: WhatsappConversationStateEnum.BOT,
  })
  state: WhatsappConversationStateEnum;

  @Column({
    name: 'escalation_reason',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  escalationReason: WhatsappEscalationReasonEnum | null;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId: string | null;

  /** Cita que salió de este chat, cuando hubo una. */
  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null;

  /** Ordena la bandeja. Se mueve con cualquier mensaje, entre o salga. */
  @Column({ name: 'last_message_at', type: 'timestamp' })
  lastMessageAt: Date;

  /**
   * Último mensaje **del cliente**. De aquí sale la ventana de 24 h de Meta:
   * pasada esa hora, el texto libre ya no viaja y hay que usar plantilla.
   */
  @Column({ name: 'last_inbound_at', type: 'timestamp', nullable: true })
  lastInboundAt: Date | null;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => Client, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client?: Client | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser?: User | null;
}
