import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WhatsappConversation } from './whatsapp-conversation.entity';
import { User } from '../../users/entities/user.entity';

/** Quién escribió el mensaje. */
export enum WhatsappMessageAuthorEnum {
  /** El cliente, desde su WhatsApp. */
  CUSTOMER = 'CUSTOMER',
  /** El asistente automático. */
  BOT = 'BOT',
  /** Una persona del taller que tomó la conversación. */
  AGENT = 'AGENT',
}

export enum WhatsappMessageDirectionEnum {
  IN = 'IN',
  OUT = 'OUT',
}

/** Acuse de Meta sobre un mensaje que se mandó. */
export enum WhatsappMessageStatusEnum {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

@Entity('whatsapp_messages')
@Index(['conversationId', 'createdAt'])
export class WhatsappMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'author', type: 'varchar', length: 10 })
  author: WhatsappMessageAuthorEnum;

  /** Quién del taller lo escribió. Null cuando fue el cliente o el bot. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /** Tal como viaja por WhatsApp, con `*negritas*` y saltos de línea. */
  @Column({ name: 'body', type: 'text', nullable: true })
  body: string | null;

  /** Key en B2. Se llena en F5; por ahora la foto sólo se registra. */
  @Column({
    name: 'attachment_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  attachmentKey: string | null;

  @Column({
    name: 'attachment_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  attachmentType: string | null;

  /**
   * `id` del mensaje en Meta. Único: es lo que impide que un reintento del
   * webhook guarde el mismo mensaje dos veces.
   */
  @Column({
    name: 'wa_message_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  waMessageId: string | null;

  @Column({ name: 'direction', type: 'varchar', length: 3 })
  direction: WhatsappMessageDirectionEnum;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: true })
  status: WhatsappMessageStatusEnum | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => WhatsappConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: WhatsappConversation;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
