import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import {
  WhatsappConversation,
  WhatsappConversationStateEnum,
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
  };
  let messageRepo: { create: jest.Mock; save: jest.Mock };
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
    };
    messageRepo = {
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn((v) => Promise.resolve({ id: 'msg-1', ...v })),
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
});
