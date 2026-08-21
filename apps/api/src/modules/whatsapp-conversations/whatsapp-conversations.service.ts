import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  WhatsappConversation,
  WhatsappConversationStateEnum,
} from './entities/whatsapp-conversation.entity';
import {
  WhatsappMessage,
  WhatsappMessageAuthorEnum,
  WhatsappMessageDirectionEnum,
} from './entities/whatsapp-message.entity';
import { Client } from '../clients/entities/client.entity';

/** Los estados en los que la conversación sigue viva. */
export const OPEN_STATES = [
  WhatsappConversationStateEnum.BOT,
  WhatsappConversationStateEnum.WITH_AGENT,
];

export interface RecordInboundParams {
  tenantId: string;
  branchId: string;
  phone: string;
  waMessageId: string;
  body?: string;
  profileName?: string;
  attachmentType?: string;
}

export interface RecordOutboundParams {
  author: WhatsappMessageAuthorEnum.BOT | WhatsappMessageAuthorEnum.AGENT;
  body: string;
  /** Quién del taller lo mandó. Sólo para `AGENT`. */
  userId?: string;
  /** `id` que devolvió Meta al aceptarlo. */
  waMessageId?: string;
}

/**
 * Guarda lo que pasa por WhatsApp.
 *
 * Es la pieza que le faltaba a la pantalla de Conversaciones: hasta ahora los
 * chats no se guardaban en ningún lado, así que no había nada que mostrar más
 * allá del mock.
 */
@Injectable()
export class WhatsappConversationsService {
  private readonly logger = new Logger(WhatsappConversationsService.name);

  constructor(
    @InjectRepository(WhatsappConversation)
    private readonly conversationRepo: Repository<WhatsappConversation>,
    @InjectRepository(WhatsappMessage)
    private readonly messageRepo: Repository<WhatsappMessage>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  /**
   * Registra un mensaje del cliente y devuelve la conversación a la que quedó
   * pegado, creándola si es la primera vez que escribe.
   */
  async recordInbound(
    params: RecordInboundParams,
  ): Promise<WhatsappConversation> {
    const conversation = await this.findOrCreateOpen(params);
    const now = new Date();

    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        author: WhatsappMessageAuthorEnum.CUSTOMER,
        body: params.body ?? null,
        attachmentType: params.attachmentType ?? null,
        waMessageId: params.waMessageId,
        direction: WhatsappMessageDirectionEnum.IN,
      }),
    );

    conversation.lastMessageAt = now;
    conversation.lastInboundAt = now;
    conversation.unreadCount += 1;
    // El nombre del perfil puede llegar después del primer mensaje, o cambiar.
    if (params.profileName && !conversation.contactName) {
      conversation.contactName = params.profileName;
    }
    return this.conversationRepo.save(conversation);
  }

  /** Registra algo que salió del taller: respuesta del bot o de un asesor. */
  async recordOutbound(
    conversationId: string,
    params: RecordOutboundParams,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      this.logger.warn(
        `No se pudo registrar la salida: conversación ${conversationId} no existe`,
      );
      return;
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId: conversation.tenantId,
        conversationId,
        author: params.author,
        userId: params.userId ?? null,
        body: params.body,
        waMessageId: params.waMessageId ?? null,
        direction: WhatsappMessageDirectionEnum.OUT,
      }),
    );

    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);
  }

  /** La conversación abierta de ese teléfono en esa sucursal, si la hay. */
  async findOpen(
    branchId: string,
    phone: string,
  ): Promise<WhatsappConversation | null> {
    return this.conversationRepo.findOne({
      where: {
        branchId,
        phone: this.normalizePhone(phone),
        state: In(OPEN_STATES),
      },
    });
  }

  /** Cierra la conversación con el desenlace que tuvo. */
  async close(
    conversationId: string,
    state:
      | WhatsappConversationStateEnum.BOOKED
      | WhatsappConversationStateEnum.CANCELLED
      | WhatsappConversationStateEnum.EXPIRED,
    appointmentId?: string,
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      state,
      ...(appointmentId ? { appointmentId } : {}),
    });
  }

  private async findOrCreateOpen(
    params: RecordInboundParams,
  ): Promise<WhatsappConversation> {
    const phone = this.normalizePhone(params.phone);

    const existing = await this.conversationRepo.findOne({
      where: { branchId: params.branchId, phone, state: In(OPEN_STATES) },
    });
    if (existing) return existing;

    const now = new Date();
    return this.conversationRepo.save(
      this.conversationRepo.create({
        tenantId: params.tenantId,
        branchId: params.branchId,
        clientId: await this.findClientIdByPhone(params.tenantId, phone),
        phone,
        contactName: params.profileName ?? null,
        state: WhatsappConversationStateEnum.BOT,
        lastMessageAt: now,
        lastInboundAt: now,
        unreadCount: 0,
      }),
    );
  }

  /** Meta manda el número sin `+` ni separadores; se guarda igual. */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Busca al cliente por los últimos 10 dígitos.
   *
   * Los teléfonos de `clients` los captura gente y vienen de todas formas
   * —con lada, sin lada, con espacios, con `+52`—, mientras que Meta manda
   * `521` al frente para México. Comparar el número completo no empata casi
   * nunca; los últimos 10 dígitos son el número nacional y sí.
   *
   * Si empatan varios (dos familiares con el mismo teléfono), no se adivina:
   * la conversación se queda sin cliente y alguien la liga a mano.
   */
  private async findClientIdByPhone(
    tenantId: string,
    phone: string,
  ): Promise<string | null> {
    const last10 = phone.slice(-10);
    if (last10.length < 10) return null;

    const matches = await this.clientRepo
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere(
        `right(regexp_replace(c.phone, '\\D', '', 'g'), 10) = :last10`,
        { last10 },
      )
      .limit(2)
      .getRawMany<{ id: string }>();

    return matches.length === 1 ? matches[0].id : null;
  }
}
