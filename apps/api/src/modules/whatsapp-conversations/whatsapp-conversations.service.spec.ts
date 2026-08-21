import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ScopeEnum, User } from '../users/entities/user.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { WhatsappRoutingService } from '../whatsapp-core/whatsapp-routing.service';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import { StorageService } from '../../common/storage/storage.service';
import { ConversationErrorCode } from './dto/send-message.dto';
import {
  WhatsappConversation,
  WhatsappConversationStateEnum,
  WhatsappEscalationReasonEnum,
} from './entities/whatsapp-conversation.entity';
import {
  WhatsappMessage,
  WhatsappMessageAuthorEnum,
  WhatsappMessageDirectionEnum,
} from './entities/whatsapp-message.entity';
import { WhatsappConversationsService } from './whatsapp-conversations.service';

const TENANT = 'tenant-1';
const BRANCH = 'branch-1';

/** Como lo manda Meta para México: 52 + 1 + los diez dígitos nacionales. */
const META_PHONE = '5218112345678';

describe('WhatsappConversationsService', () => {
  let service: WhatsappConversationsService;
  let conversationRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let messageRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let convQb: Record<string, jest.Mock>;
  let msgQb: Record<string, jest.Mock>;
  let routing: { credentialsFor: jest.Mock };
  let whatsapp: { sendText: jest.Mock };
  let storage: { getSignedUrl: jest.Mock };
  let mediaQueue: { add: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let clientQb: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    limit: jest.Mock;
    getRawMany: jest.Mock;
  };

  beforeEach(async () => {
    conversationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((v) => Promise.resolve({ id: 'conv-1', ...v })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };
    // Un query builder encadenable: cada método devuelve el mismo objeto, y
    // las aserciones miran qué condiciones se le pidieron.
    const chainable = (): Record<string, jest.Mock> => {
      const qb: Record<string, jest.Mock> = {};
      for (const m of [
        'select',
        'addSelect',
        'leftJoinAndSelect',
        'innerJoin',
        'where',
        'andWhere',
        'orderBy',
        'addOrderBy',
        'distinctOn',
        'skip',
        'take',
      ]) {
        qb[m] = jest.fn(() => qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      qb.getOne = jest.fn().mockResolvedValue(null);
      return qb;
    };

    convQb = chainable();
    msgQb = chainable();

    routing = {
      credentialsFor: jest
        .fn()
        .mockResolvedValue({ phoneNumberId: '123', token: 'tok' }),
    };
    whatsapp = {
      sendText: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'wamid.out' }),
    };
    storage = {
      getSignedUrl: jest.fn().mockResolvedValue('https://b2.signed/url'),
    };
    mediaQueue = { add: jest.fn().mockResolvedValue(undefined) };
    eventEmitter = { emit: jest.fn() };

    conversationRepo.createQueryBuilder = jest.fn(() => convQb);

    messageRepo = {
      create: jest.fn((v) => ({ ...v })),
      // `createdAt` lo llena TypeORM al guardar (@CreateDateColumn); el mock
      // hace lo mismo para no mentir sobre lo que devuelve save().
      save: jest.fn((v) =>
        Promise.resolve({ id: 'msg-1', createdAt: new Date(), ...v }),
      ),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => msgQb),
    };
    clientQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappConversationsService,
        {
          provide: getRepositoryToken(WhatsappConversation),
          useValue: conversationRepo,
        },
        {
          provide: getRepositoryToken(WhatsappMessage),
          useValue: messageRepo,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: { createQueryBuilder: () => clientQb },
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest
              .fn()
              .mockResolvedValue({ firstName: 'Iván', lastName: 'Robles' }),
          },
        },
        { provide: WhatsappRoutingService, useValue: routing },
        { provide: WhatsAppProvider, useValue: whatsapp },
        { provide: StorageService, useValue: storage },
        { provide: getQueueToken('whatsapp-media'), useValue: mediaQueue },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(WhatsappConversationsService);
  });

  const inbound = (
    over: Partial<Parameters<typeof service.recordInbound>[0]> = {},
  ) =>
    service.recordInbound({
      tenantId: TENANT,
      branchId: BRANCH,
      phone: META_PHONE,
      waMessageId: 'wamid.1',
      body: 'hola',
      ...over,
    });

  describe('recordInbound', () => {
    it('abre una conversación la primera vez que ese teléfono escribe', async () => {
      await inbound({ profileName: 'Laura' });

      expect(conversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          branchId: BRANCH,
          phone: META_PHONE,
          contactName: 'Laura',
          state: WhatsappConversationStateEnum.BOT,
        }),
      );
    });

    it('guarda el mensaje del cliente como entrante', async () => {
      await inbound();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: WhatsappMessageAuthorEnum.CUSTOMER,
          direction: WhatsappMessageDirectionEnum.IN,
          body: 'hola',
          waMessageId: 'wamid.1',
        }),
      );
    });

    it('reutiliza la conversación abierta en vez de crear otra', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-existente',
        tenantId: TENANT,
        branchId: BRANCH,
        phone: META_PHONE,
        state: WhatsappConversationStateEnum.BOT,
        unreadCount: 2,
        contactName: 'Laura',
      });

      const conv = await inbound();

      expect(conversationRepo.create).not.toHaveBeenCalled();
      expect(conv.id).toBe('conv-existente');
      // Un mensaje más sin leer que antes.
      expect(conv.unreadCount).toBe(3);
    });

    it('guarda el teléfono sólo con dígitos', async () => {
      await inbound({ phone: '+52 (81) 1234-5678' });

      expect(conversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '528112345678' }),
      );
    });

    it('registra la foto aunque todavía no se descargue el archivo', async () => {
      await inbound({ body: undefined, attachmentType: 'image' });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: null, attachmentType: 'image' }),
      );
    });

    describe('descarga del adjunto en segundo plano (F5)', () => {
      it('encola la descarga cuando el adjunto trae mediaId', async () => {
        await inbound({
          body: undefined,
          attachmentType: 'image',
          mediaId: 'wamid.media-1',
        });

        expect(mediaQueue.add).toHaveBeenCalledWith(
          'download',
          expect.objectContaining({
            messageId: 'msg-1',
            tenantId: TENANT,
            branchId: BRANCH,
            conversationId: 'conv-1',
            waMessageId: 'wamid.1',
            mediaId: 'wamid.media-1',
            mediaType: 'image',
          }),
          expect.objectContaining({ attempts: expect.any(Number) }),
        );
      });

      it('no encola nada sin mediaId, aunque haya attachmentType', async () => {
        await inbound({ body: undefined, attachmentType: 'image' });

        expect(mediaQueue.add).not.toHaveBeenCalled();
      });

      it('no encola nada para un mensaje de puro texto', async () => {
        await inbound();

        expect(mediaQueue.add).not.toHaveBeenCalled();
      });

      it('no revienta si la cola no responde: el mensaje ya quedó guardado', async () => {
        mediaQueue.add.mockRejectedValue(new Error('sin Redis'));

        await expect(
          inbound({
            body: undefined,
            attachmentType: 'image',
            mediaId: 'wamid.media-1',
          }),
        ).resolves.toBeDefined();
      });
    });

    describe('liga con el cliente por teléfono', () => {
      it('empata por los últimos diez dígitos, ignorando lada y formato', async () => {
        clientQb.getRawMany.mockResolvedValue([{ id: 'client-1' }]);

        await inbound();

        expect(clientQb.andWhere).toHaveBeenCalledWith(expect.any(String), {
          last10: '8112345678',
        });
        expect(conversationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ clientId: 'client-1' }),
        );
      });

      it('no adivina cuando dos clientes comparten el teléfono', async () => {
        clientQb.getRawMany.mockResolvedValue([
          { id: 'client-1' },
          { id: 'client-2' },
        ]);

        await inbound();

        expect(conversationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ clientId: null }),
        );
      });

      it('deja la conversación sin cliente si no empata ninguno', async () => {
        await inbound();

        expect(conversationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ clientId: null }),
        );
      });
    });
  });

  describe('recordOutbound', () => {
    beforeEach(() => {
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        tenantId: TENANT,
        branchId: BRANCH,
        lastMessageAt: new Date('2020-01-01'),
      });
    });

    it('guarda la respuesta del bot como saliente', async () => {
      await service.recordOutbound('conv-1', {
        author: WhatsappMessageAuthorEnum.BOT,
        body: '¿Qué servicio necesitas?',
        waMessageId: 'wamid.out',
      });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: WhatsappMessageAuthorEnum.BOT,
          direction: WhatsappMessageDirectionEnum.OUT,
          userId: null,
          waMessageId: 'wamid.out',
        }),
      );
    });

    it('anota quién del taller escribió cuando fue un asesor', async () => {
      await service.recordOutbound('conv-1', {
        author: WhatsappMessageAuthorEnum.AGENT,
        body: 'Yo te ayudo',
        userId: 'user-9',
      });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: WhatsappMessageAuthorEnum.AGENT,
          userId: 'user-9',
        }),
      );
    });

    it('adelanta la última actividad para que suba en la bandeja', async () => {
      await service.recordOutbound('conv-1', {
        author: WhatsappMessageAuthorEnum.BOT,
        body: 'hola',
      });

      const guardada = conversationRepo.save.mock.calls[0][0] as {
        lastMessageAt: Date;
      };
      expect(guardada.lastMessageAt.getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime(),
      );
    });

    it('no revienta si la conversación ya no existe', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordOutbound('conv-fantasma', {
          author: WhatsappMessageAuthorEnum.BOT,
          body: 'hola',
        }),
      ).resolves.toBeUndefined();
      expect(messageRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('cierra como agendada y guarda de qué cita se trata', async () => {
      await service.close(
        'conv-1',
        WhatsappConversationStateEnum.BOOKED,
        'appt-1',
      );

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.BOOKED,
        appointmentId: 'appt-1',
      });
    });

    it('cierra sin cita cuando no hubo', async () => {
      await service.close('conv-1', WhatsappConversationStateEnum.CANCELLED);

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.CANCELLED,
      });
    });
  });

  // ─── Lectura ─────────────────────────────────────

  const userWith = (over: Partial<UserPayload> = {}): UserPayload =>
    ({
      sub: 'user-1',
      tenantId: TENANT,
      branchId: BRANCH,
      scope: ScopeEnum.GLOBAL,
      roles: ['ADMIN'],
      ...over,
    }) as UserPayload;

  /** Junta las condiciones que se le pusieron al query builder. */
  const conditions = (qb: Record<string, jest.Mock>): string =>
    [...qb.where.mock.calls, ...qb.andWhere.mock.calls]
      .map((c) => String(c[0]))
      .join(' | ');

  const conversationRow = (over = {}) => ({
    id: 'conv-1',
    tenantId: TENANT,
    branchId: BRANCH,
    clientId: null,
    phone: META_PHONE,
    contactName: 'Laura Jiménez',
    state: WhatsappConversationStateEnum.BOT,
    escalationReason: null,
    appointmentId: null,
    lastMessageAt: new Date('2026-08-21T10:00:00Z'),
    lastInboundAt: new Date('2026-08-21T10:00:00Z'),
    unreadCount: 2,
    assignedUser: null,
    ...over,
  });

  describe('findAll', () => {
    it('acota siempre al tenant del usuario', async () => {
      await service.findAll(userWith(), {});

      expect(conditions(convQb)).toContain('c.tenant_id = :tenantId');
      expect(convQb.where).toHaveBeenCalledWith(expect.any(String), {
        tenantId: TENANT,
      });
    });

    it('con scope SUCURSAL sólo deja ver la sucursal del usuario', async () => {
      await service.findAll(
        userWith({ scope: ScopeEnum.SUCURSAL, branchId: 'branch-propia' }),
        {},
      );

      expect(conditions(convQb)).toContain('c.branch_id = :userBranchId');
      expect(convQb.andWhere).toHaveBeenCalledWith(expect.any(String), {
        userBranchId: 'branch-propia',
      });
    });

    it('con scope LEGAL_ENTITY se limita a las sucursales de su razón social', async () => {
      await service.findAll(
        userWith({ scope: ScopeEnum.LEGAL_ENTITY, legalEntityId: 'le-1' }),
        {},
      );

      expect(convQb.innerJoin).toHaveBeenCalled();
      expect(conditions(convQb)).toContain('b.legal_entity_id');
    });

    it('con scope GLOBAL no agrega filtro de sucursal', async () => {
      await service.findAll(userWith({ scope: ScopeEnum.GLOBAL }), {});

      expect(conditions(convQb)).not.toContain('c.branch_id');
      expect(convQb.innerJoin).not.toHaveBeenCalled();
    });

    it('ordena por la última actividad, lo más reciente primero', async () => {
      await service.findAll(userWith(), {});

      // Por propiedad y no por columna: al paginar, TypeORM resuelve el
      // ORDER BY contra los metadatos de la entidad y con `last_message_at`
      // truena. Sale en la prueba porque el mock no lo distingue.
      expect(convQb.orderBy).toHaveBeenCalledWith('c.lastMessageAt', 'DESC');
    });

    it('con escalated=true sólo deja las que tuvieron que escalar', async () => {
      await service.findAll(userWith(), { escalated: true });

      expect(conditions(convQb)).toContain('c.escalation_reason IS NOT NULL');
    });

    it('sin escalated no filtra por motivo de escalamiento', async () => {
      await service.findAll(userWith(), {});

      expect(conditions(convQb)).not.toContain('escalation_reason');
    });

    it('busca el teléfono por dígitos, ignorando cómo lo hayan pegado', async () => {
      await service.findAll(userWith(), { q: '(81) 1234-5678' });

      expect(convQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('c.phone LIKE :digits'),
        expect.objectContaining({ digits: '%8112345678%' }),
      );
    });

    it('enmascara el teléfono y usa el nombre del contacto', async () => {
      convQb.getManyAndCount.mockResolvedValue([[conversationRow()], 1]);

      const { data } = await service.findAll(userWith(), {});

      expect(data[0].name).toBe('Laura Jiménez');
      expect(data[0].phone).toBe('5218 **** 5678');
      expect(data[0].phone).not.toContain('1234');
    });

    it('sin nombre de contacto, muestra el teléfono enmascarado', async () => {
      convQb.getManyAndCount.mockResolvedValue([
        [conversationRow({ contactName: null })],
        1,
      ]);

      const { data } = await service.findAll(userWith(), {});

      expect(data[0].name).toBe('5218 **** 5678');
    });
  });

  describe('findOne', () => {
    it('404 cuando la conversación es de otra sucursal', async () => {
      convQb.getOne.mockResolvedValue(null);

      await expect(
        service.findOne(userWith({ scope: ScopeEnum.SUCURSAL }), 'conv-ajena'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve la transcripción en orden', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());
      messageRepo.find.mockResolvedValue([
        {
          id: 'm1',
          author: WhatsappMessageAuthorEnum.CUSTOMER,
          body: 'hola',
          attachmentType: null,
          user: null,
          createdAt: new Date('2026-08-21T09:59:00Z'),
        },
        {
          id: 'm2',
          author: WhatsappMessageAuthorEnum.AGENT,
          body: 'Yo te ayudo',
          attachmentType: null,
          user: { firstName: 'Karla', lastName: 'Medina' },
          createdAt: new Date('2026-08-21T10:00:00Z'),
        },
      ]);

      const detail = await service.findOne(userWith(), 'conv-1');

      expect(messageRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
      expect(detail.messages).toHaveLength(2);
      expect(detail.messages[1].agentName).toBe('Karla Medina');
      // El del cliente no lleva nombre de agente.
      expect(detail.messages[0].agentName).toBeNull();
    });

    describe('ventana de 24 h de Meta', () => {
      it('deja contestar si el cliente escribió hace poco', async () => {
        convQb.getOne.mockResolvedValue(
          conversationRow({ lastInboundAt: new Date(Date.now() - 60_000) }),
        );

        const detail = await service.findOne(userWith(), 'conv-1');

        expect(detail.canReplyFreeText).toBe(true);
        expect(detail.windowExpiresAt).not.toBeNull();
      });

      it('no deja contestar pasadas las 24 h del último mensaje del cliente', async () => {
        convQb.getOne.mockResolvedValue(
          conversationRow({
            lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
          }),
        );

        const detail = await service.findOne(userWith(), 'conv-1');

        expect(detail.canReplyFreeText).toBe(false);
      });

      it('no deja contestar si el cliente nunca escribió', async () => {
        convQb.getOne.mockResolvedValue(
          conversationRow({ lastInboundAt: null }),
        );

        const detail = await service.findOne(userWith(), 'conv-1');

        expect(detail.canReplyFreeText).toBe(false);
        expect(detail.windowExpiresAt).toBeNull();
      });
    });

    it('describe la foto aunque el archivo todavía no esté disponible', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());
      messageRepo.find.mockResolvedValue([
        {
          id: 'm1',
          author: WhatsappMessageAuthorEnum.CUSTOMER,
          body: null,
          attachmentType: 'image',
          user: null,
          createdAt: new Date(),
        },
      ]);

      const detail = await service.findOne(userWith(), 'conv-1');

      expect(detail.messages[0].attachment).toEqual({
        type: 'image',
        url: null,
      });
      expect(detail.lastLine).toBe('📷 Imagen');
      // Sin key no hay nada que firmar.
      expect(storage.getSignedUrl).not.toHaveBeenCalled();
    });

    it('firma la URL del adjunto una vez que ya se descargó', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());
      messageRepo.find.mockResolvedValue([
        {
          id: 'm1',
          author: WhatsappMessageAuthorEnum.CUSTOMER,
          body: null,
          attachmentType: 'image',
          attachmentKey: 'whatsapp/tenant-1/conv-1/wamid.1.jpg',
          user: null,
          createdAt: new Date(),
        },
      ]);

      const detail = await service.findOne(userWith(), 'conv-1');

      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        'whatsapp/tenant-1/conv-1/wamid.1.jpg',
      );
      expect(detail.messages[0].attachment).toEqual({
        type: 'image',
        url: 'https://b2.signed/url',
      });
    });
  });

  // ─── Toma y respuesta del asesor ─────────────────

  /** Lo que devuelve el código de una excepción con `code`. */
  const codeOf = async (fn: () => Promise<unknown>): Promise<string> => {
    try {
      await fn();
    } catch (e) {
      return (e as { response: { code: string } }).response.code;
    }
    throw new Error('se esperaba que fallara');
  };

  describe('take', () => {
    it('pone la conversación en manos del asesor que la tomó', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());

      await service.take(userWith({ sub: 'user-9' }), 'conv-1');

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.WITH_AGENT,
        assignedUserId: 'user-9',
      });
    });

    it('volver a tomar la propia no falla ni la reasigna', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: 'user-9',
        }),
      );

      await service.take(userWith({ sub: 'user-9' }), 'conv-1');

      expect(conversationRepo.update).not.toHaveBeenCalled();
    });

    it('no deja arrebatarle la conversación a otro asesor', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: 'otro-asesor',
        }),
      );

      await expect(
        codeOf(() => service.take(userWith({ sub: 'user-9' }), 'conv-1')),
      ).resolves.toBe(ConversationErrorCode.ALREADY_TAKEN);
    });

    it('no se puede tomar una conversación que ya terminó', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({ state: WhatsappConversationStateEnum.BOOKED }),
      );

      await expect(
        codeOf(() => service.take(userWith(), 'conv-1')),
      ).resolves.toBe(ConversationErrorCode.NOT_TAKEABLE);
    });

    it('404 si la conversación es de otra sucursal', async () => {
      convQb.getOne.mockResolvedValue(null);

      await expect(
        service.take(userWith({ scope: ScopeEnum.SUCURSAL }), 'conv-ajena'),
      ).rejects.toThrow(NotFoundException);
    });

    it('cualquier asesor puede tomar una conversación ya escalada y sin asignar', async () => {
      // La dejó `escalate()`: WITH_AGENT pero nadie asignado todavía. Antes
      // de la corrección, el código trataba todo WITH_AGENT como "ya la
      // tiene alguien" y esto tronaba con ALREADY_TAKEN contra nadie.
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: null,
          escalationReason: WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
        }),
      );

      await service.take(userWith({ sub: 'user-9' }), 'conv-1');

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.WITH_AGENT,
        assignedUserId: 'user-9',
      });
    });

    it('el asesor puede marcar que el bot se equivocó al tomarla', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());

      await service.take(
        userWith({ sub: 'user-9' }),
        'conv-1',
        WhatsappEscalationReasonEnum.BOT_WAS_WRONG,
      );

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.WITH_AGENT,
        assignedUserId: 'user-9',
        escalationReason: WhatsappEscalationReasonEnum.BOT_WAS_WRONG,
      });
    });
  });

  describe('escalate', () => {
    it('pone la conversación en WITH_AGENT sin asignar a nadie y guarda el motivo', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        tenantId: TENANT,
        branchId: BRANCH,
        phone: META_PHONE,
        contactName: 'Laura',
        state: WhatsappConversationStateEnum.BOT,
      });

      await service.escalate('conv-1', WhatsappEscalationReasonEnum.BOT_LOOPED);

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.WITH_AGENT,
        escalationReason: WhatsappEscalationReasonEnum.BOT_LOOPED,
      });
    });

    it('avisa a los asesores con un evento de dominio', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        tenantId: TENANT,
        branchId: BRANCH,
        phone: META_PHONE,
        contactName: 'Laura',
        state: WhatsappConversationStateEnum.BOT,
      });

      await service.escalate(
        'conv-1',
        WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'conversacion.escalada',
        expect.objectContaining({
          conversationId: 'conv-1',
          branchId: BRANCH,
          tenantId: TENANT,
          reason: WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
          phone: META_PHONE,
          contactName: 'Laura',
        }),
      );
    });

    it('no pisa una conversación que ya no está con el bot', async () => {
      // Ya la tomó un asesor (o ya escaló) justo antes: no hay que
      // regresarla a un estado anterior.
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        tenantId: TENANT,
        branchId: BRANCH,
        phone: META_PHONE,
        state: WhatsappConversationStateEnum.WITH_AGENT,
        assignedUserId: 'user-9',
      });

      await service.escalate('conv-1', WhatsappEscalationReasonEnum.BOT_LOOPED);

      expect(conversationRepo.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('no revienta si la conversación ya no existe', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.escalate(
          'conv-fantasma',
          WhatsappEscalationReasonEnum.BOT_LOOPED,
        ),
      ).resolves.toBeUndefined();
      expect(conversationRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('la devuelve al asistente y la deja sin asignar', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: 'user-9',
        }),
      );

      await service.release(userWith({ sub: 'user-9' }), 'conv-1');

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        state: WhatsappConversationStateEnum.BOT,
        assignedUserId: null,
      });
    });

    it('un responsable puede destrabar la que tomó alguien más', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: 'quien-se-fue-a-comer',
        }),
      );

      await service.release(
        userWith({ sub: 'jefa', roles: ['MANAGER'] }),
        'conv-1',
      );

      expect(conversationRepo.update).toHaveBeenCalled();
    });

    it('un compañero sin mando no puede soltarle la conversación a otro', async () => {
      convQb.getOne.mockResolvedValue(
        conversationRow({
          state: WhatsappConversationStateEnum.WITH_AGENT,
          assignedUserId: 'otro-asesor',
        }),
      );

      await expect(
        codeOf(() =>
          service.release(
            userWith({ sub: 'user-9', roles: ['CASHIER'] }),
            'conv-1',
          ),
        ),
      ).resolves.toBe(ConversationErrorCode.ALREADY_TAKEN);
    });

    it('no se puede soltar la que nadie tomó', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());

      await expect(
        codeOf(() => service.release(userWith(), 'conv-1')),
      ).resolves.toBe(ConversationErrorCode.NOT_TAKEN);
    });
  });

  describe('sendMessage', () => {
    const tomadaPor = (sub: string, over = {}) =>
      conversationRow({
        state: WhatsappConversationStateEnum.WITH_AGENT,
        assignedUserId: sub,
        lastInboundAt: new Date(Date.now() - 60_000),
        ...over,
      });

    it('manda por WhatsApp con las credenciales de la sucursal', async () => {
      convQb.getOne.mockResolvedValue(tomadaPor('user-9'));

      await service.sendMessage(userWith({ sub: 'user-9' }), 'conv-1', {
        text: 'Ya lo reviso y te confirmo',
      });

      expect(routing.credentialsFor).toHaveBeenCalledWith(BRANCH);
      expect(whatsapp.sendText).toHaveBeenCalledWith(
        META_PHONE,
        'Ya lo reviso y te confirmo',
        { phoneNumberId: '123', token: 'tok' },
      );
    });

    it('guarda el mensaje a nombre de quien lo escribió', async () => {
      convQb.getOne.mockResolvedValue(tomadaPor('user-9'));

      const msg = await service.sendMessage(
        userWith({ sub: 'user-9' }),
        'conv-1',
        { text: 'Hola' },
      );

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: WhatsappMessageAuthorEnum.AGENT,
          userId: 'user-9',
          direction: WhatsappMessageDirectionEnum.OUT,
          waMessageId: 'wamid.out',
        }),
      );
      expect(msg.agentName).toBe('Iván Robles');
    });

    it('no guarda nada si Meta rechaza el envío', async () => {
      convQb.getOne.mockResolvedValue(tomadaPor('user-9'));
      whatsapp.sendText.mockResolvedValue({ success: false });

      await expect(
        codeOf(() =>
          service.sendMessage(userWith({ sub: 'user-9' }), 'conv-1', {
            text: 'Hola',
          }),
        ),
      ).resolves.toBe(ConversationErrorCode.SEND_FAILED);
      // Lo importante: la pantalla no muestra un mensaje que nadie recibió.
      expect(messageRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza pasada la ventana de 24 h, sin llamar a Meta', async () => {
      convQb.getOne.mockResolvedValue(
        tomadaPor('user-9', {
          lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        }),
      );

      await expect(
        codeOf(() =>
          service.sendMessage(userWith({ sub: 'user-9' }), 'conv-1', {
            text: 'Hola',
          }),
        ),
      ).resolves.toBe(ConversationErrorCode.WINDOW_CLOSED);
      expect(whatsapp.sendText).not.toHaveBeenCalled();
    });

    it('hay que tomarla antes de responder', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());

      await expect(
        codeOf(() =>
          service.sendMessage(userWith(), 'conv-1', { text: 'Hola' }),
        ),
      ).resolves.toBe(ConversationErrorCode.NOT_TAKEN);
      expect(whatsapp.sendText).not.toHaveBeenCalled();
    });

    it('no se puede responder en la conversación de otro asesor', async () => {
      convQb.getOne.mockResolvedValue(tomadaPor('otro-asesor'));

      await expect(
        codeOf(() =>
          service.sendMessage(userWith({ sub: 'user-9' }), 'conv-1', {
            text: 'Hola',
          }),
        ),
      ).resolves.toBe(ConversationErrorCode.ALREADY_TAKEN);
    });

    it('avisa si la sucursal no tiene WhatsApp configurado', async () => {
      convQb.getOne.mockResolvedValue(tomadaPor('user-9'));
      routing.credentialsFor.mockResolvedValue(null);

      await expect(
        codeOf(() =>
          service.sendMessage(userWith({ sub: 'user-9' }), 'conv-1', {
            text: 'Hola',
          }),
        ),
      ).resolves.toBe(ConversationErrorCode.NO_CREDENTIALS);
      expect(whatsapp.sendText).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('deja el pendiente en cero', async () => {
      convQb.getOne.mockResolvedValue(conversationRow());

      await service.markRead(userWith(), 'conv-1');

      expect(conversationRepo.update).toHaveBeenCalledWith('conv-1', {
        unreadCount: 0,
      });
    });

    it('404 si es de otra sucursal', async () => {
      convQb.getOne.mockResolvedValue(null);

      await expect(
        service.markRead(userWith({ scope: ScopeEnum.SUCURSAL }), 'ajena'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
