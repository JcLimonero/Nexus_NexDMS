import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
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
import { Appointment } from '../appointments/entities/appointment.entity';
import { ScopeEnum } from '../users/entities/user.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import type { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { FilterConversationsDto } from './dto/filter-conversations.dto';
import {
  ConversationDetailDto,
  ConversationSummaryDto,
  MessageDto,
} from './dto/conversation-response.dto';

/** Lo que Meta deja para contestar con texto libre. */
const FREE_TEXT_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  // ─── Lectura ─────────────────────────────────────

  /** La bandeja: lo más reciente arriba, acotado a lo que el usuario puede ver. */
  async findAll(
    user: UserPayload,
    filters: FilterConversationsDto,
  ): Promise<PaginatedResponse<ConversationSummaryDto>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.assignedUser', 'assignedUser')
      .where('c.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.state) {
      qb.andWhere('c.state = :state', { state: filters.state });
    }
    if (filters.branchId) {
      qb.andWhere('c.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.assignedUserId) {
      qb.andWhere('c.assigned_user_id = :assignedUserId', {
        assignedUserId: filters.assignedUserId,
      });
    }
    if (filters.q?.trim()) {
      const term = `%${filters.q.trim().toLowerCase()}%`;
      // El teléfono se busca sólo por dígitos: quien lo pega desde otro lado
      // lo trae con espacios y paréntesis que en la base no existen.
      const digits = filters.q.replace(/\D/g, '');
      qb.andWhere(
        digits
          ? '(LOWER(c.contact_name) LIKE :term OR c.phone LIKE :digits)'
          : 'LOWER(c.contact_name) LIKE :term',
        { term, digits: `%${digits}%` },
      );
    }

    const [rows, total] = await qb
      // Nombre de propiedad, no de columna: con skip/take TypeORM resuelve el
      // ORDER BY contra los metadatos de la entidad y `last_message_at` no
      // existe ahí. Con la columna cruda revienta al paginar.
      .orderBy('c.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const lastLines = await this.lastLineFor(rows.map((r) => r.id));

    return {
      data: rows.map((c) => this.toSummary(c, lastLines.get(c.id) ?? '')),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** La conversación con su transcripción completa. */
  async findOne(user: UserPayload, id: string): Promise<ConversationDetailDto> {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.assignedUser', 'assignedUser')
      .where('c.id = :id', { id })
      .andWhere('c.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    const conversation = await qb.getOne();
    if (!conversation) {
      // Mismo 404 esté fuera de alcance o no exista: decir "existe pero no es
      // tuya" ya es filtrar información de otra sucursal.
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }

    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    const appointment = conversation.appointmentId
      ? await this.appointmentRepo.findOne({
          where: { id: conversation.appointmentId },
        })
      : null;

    const windowExpiresAt = conversation.lastInboundAt
      ? new Date(conversation.lastInboundAt.getTime() + FREE_TEXT_WINDOW_MS)
      : null;

    const lastMessage = messages[messages.length - 1];

    return {
      ...this.toSummary(conversation, this.lineOf(lastMessage)),
      messages: messages.map((m) => this.toMessage(m)),
      canReplyFreeText: !!windowExpiresAt && windowExpiresAt > new Date(),
      windowExpiresAt: windowExpiresAt?.toISOString() ?? null,
      appointment: appointment
        ? {
            id: appointment.id,
            scheduledAt: appointment.scheduledAt.toISOString(),
            serviceType: appointment.serviceType,
            status: appointment.status,
          }
        : null,
    };
  }

  /**
   * Acota la consulta a lo que el usuario puede ver.
   *
   * Mismo criterio que en citas: la sucursal ve lo suyo, la razón social todas
   * sus sucursales, y el scope global todo el tenant.
   */
  private applyScope(
    qb: SelectQueryBuilder<WhatsappConversation>,
    user: UserPayload,
  ): void {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('c.branch_id = :userBranchId', {
          userBranchId: user.branchId,
        });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = c.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  /**
   * La última línea de cada conversación, en una sola consulta.
   *
   * `DISTINCT ON` deja el primer renglón de cada grupo ya ordenado, así que
   * saca el último mensaje de veinte conversaciones sin veinte consultas.
   */
  private async lastLineFor(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();

    const rows = await this.messageRepo
      .createQueryBuilder('m')
      .select(['m.conversation_id AS conversation_id', 'm.body AS body'])
      .addSelect('m.author', 'author')
      .addSelect('m.attachment_type', 'attachment_type')
      .distinctOn(['m.conversation_id'])
      .where('m.conversation_id IN (:...ids)', { ids })
      .orderBy('m.conversation_id')
      .addOrderBy('m.created_at', 'DESC')
      .getRawMany<{
        conversation_id: string;
        body: string | null;
        author: WhatsappMessageAuthorEnum;
        attachment_type: string | null;
      }>();

    return new Map(
      rows.map((r) => [
        r.conversation_id,
        this.lineOf({
          body: r.body,
          author: r.author,
          attachmentType: r.attachment_type,
        }),
      ]),
    );
  }

  /** Resume un mensaje en una línea para la lista. */
  private lineOf(
    m?: Pick<WhatsappMessage, 'body' | 'author' | 'attachmentType'>,
  ): string {
    if (!m) return '';
    if (!m.body)
      return m.attachmentType === 'image' ? '📷 Imagen' : '📎 Archivo';
    // Sin los asteriscos de negrita ni los saltos: es una sola línea.
    return m.body.replace(/\*/g, '').split('\n')[0];
  }

  private toSummary(
    c: WhatsappConversation,
    lastLine: string,
  ): ConversationSummaryDto {
    const phone = this.maskPhone(c.phone);
    return {
      id: c.id,
      name: c.contactName ?? phone,
      phone,
      state: c.state,
      reason: c.escalationReason,
      lastMessageAt: c.lastMessageAt.toISOString(),
      unreadCount: c.unreadCount,
      lastLine,
      branchId: c.branchId,
      clientId: c.clientId,
      assignedTo: c.assignedUser
        ? {
            id: c.assignedUser.id,
            name: `${c.assignedUser.firstName} ${c.assignedUser.lastName}`.trim(),
          }
        : null,
    };
  }

  private toMessage(m: WhatsappMessage): MessageDto {
    return {
      id: m.id,
      author: m.author,
      text: m.body,
      agentName: m.user
        ? `${m.user.firstName} ${m.user.lastName}`.trim()
        : null,
      attachment: m.attachmentType
        ? // La URL llega en F5, cuando el archivo se descargue de Meta a B2.
          { type: m.attachmentType, url: null }
        : null,
      createdAt: m.createdAt.toISOString(),
    };
  }

  /** Deja ver la lada y los últimos cuatro: suficiente para reconocerlo. */
  private maskPhone(phone: string): string {
    if (phone.length <= 6) return phone;
    return `${phone.slice(0, 4)} **** ${phone.slice(-4)}`;
  }

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
