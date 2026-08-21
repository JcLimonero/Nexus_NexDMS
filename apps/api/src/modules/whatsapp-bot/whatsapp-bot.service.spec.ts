import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import {
  WhatsappRoutingService,
  type WhatsappRoute,
} from '../whatsapp-core/whatsapp-routing.service';
import { WhatsappConversationsService } from '../whatsapp-conversations/whatsapp-conversations.service';
import { WhatsappConversationStateEnum } from '../whatsapp-conversations/entities/whatsapp-conversation.entity';
import {
  WhatsappBotService,
  type IncomingMessage,
} from './whatsapp-bot.service';

const ROUTE: WhatsappRoute = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  branchSlug: 'central',
  branchName: 'Sucursal Central',
  phoneNumberId: '123',
};

describe('WhatsappBotService', () => {
  let service: WhatsappBotService;
  let conversations: {
    recordInbound: jest.Mock;
    recordOutbound: jest.Mock;
  };
  let routing: { credentialsFor: jest.Mock };
  let whatsapp: { sendText: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      // `set` con `NX` es el guardado contra reintentos (`alreadySeen`): que
      // devuelva `'OK'` simula que la llave no existía y se acaba de tomar.
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    conversations = {
      recordInbound: jest.fn().mockResolvedValue({
        id: 'conv-1',
        state: WhatsappConversationStateEnum.BOT,
      }),
      recordOutbound: jest.fn().mockResolvedValue(undefined),
    };
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappBotService,
        { provide: 'REDIS_CLIENT', useValue: redis },
        {
          provide: getRepositoryToken(ServiceType),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: AppointmentsService, useValue: {} },
        { provide: UserAvailabilityService, useValue: {} },
        { provide: WhatsAppProvider, useValue: whatsapp },
        { provide: WhatsappRoutingService, useValue: routing },
        { provide: WhatsappConversationsService, useValue: conversations },
      ],
    }).compile();

    service = module.get(WhatsappBotService);
  });

  const incoming = (over: Partial<IncomingMessage> = {}): IncomingMessage => ({
    waMessageId: 'wamid.1',
    from: '5218112345678',
    type: 'text',
    text: 'hola',
    ...over,
  });

  describe('adjuntos (F5)', () => {
    it('pasa attachmentType y mediaId a recordInbound cuando llega una foto', async () => {
      await service.handleIncoming(
        ROUTE,
        incoming({ type: 'image', text: '', mediaId: 'media-1' }),
      );

      expect(conversations.recordInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentType: 'image',
          mediaId: 'media-1',
          body: undefined,
        }),
      );
    });

    it('no manda attachmentType ni mediaId para un tipo no soportado (video, sticker...)', async () => {
      await service.handleIncoming(
        ROUTE,
        incoming({ type: 'unsupported', text: '', mediaId: 'media-1' }),
      );

      expect(conversations.recordInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentType: undefined,
          mediaId: undefined,
        }),
      );
    });

    it('avisa que sí recibió el archivo, sin prometer que lo entiende', async () => {
      const salida = await service.handleIncoming(
        ROUTE,
        incoming({ type: 'document', text: '', mediaId: 'media-1' }),
      );

      expect(salida[0]).toContain('Recibí tu archivo');
      // El mensaje viejo ("sólo puedo leer mensajes de texto") ya no aplica:
      // desde F5 el archivo sí se guarda.
      expect(salida[0]).not.toContain('sólo puedo leer mensajes de texto');
    });

    it('a un tipo no soportado sí le dice que sólo lee texto: de ese no se guardó nada', async () => {
      const salida = await service.handleIncoming(
        ROUTE,
        incoming({ type: 'unsupported', text: '' }),
      );

      expect(salida[0]).toContain('sólo puedo leer mensajes de texto');
    });

    it('el bot se calla si ya la atiende un asesor, aunque llegue una foto', async () => {
      conversations.recordInbound.mockResolvedValue({
        id: 'conv-1',
        state: WhatsappConversationStateEnum.WITH_AGENT,
      });

      const salida = await service.handleIncoming(
        ROUTE,
        incoming({ type: 'image', text: '', mediaId: 'media-1' }),
      );

      expect(salida).toEqual([]);
      expect(whatsapp.sendText).not.toHaveBeenCalled();
    });
  });
});
