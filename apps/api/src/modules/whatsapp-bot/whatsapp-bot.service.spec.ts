import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentOriginEnum } from '../appointments/entities/appointment.entity';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import { WhatsappRoutingService } from '../whatsapp-core/whatsapp-routing.service';
import { WhatsappConversationsService } from '../whatsapp-conversations/whatsapp-conversations.service';
import {
  WhatsappConversationStateEnum,
  WhatsappEscalationReasonEnum,
} from '../whatsapp-conversations/entities/whatsapp-conversation.entity';
import {
  WhatsappBotService,
  type IncomingMessage,
} from './whatsapp-bot.service';
import type { WhatsappRoute } from '../whatsapp-core/whatsapp-routing.service';

const ROUTE: WhatsappRoute = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  branchSlug: 'central',
  branchName: 'Sucursal Central',
  phoneNumberId: '123456789012345',
};

const PHONE = '5218112345678';

/**
 * Redis de mentiras que sí guarda: la sesión del bot vive entre mensajes, y
 * la detección de bucle depende de que el `loopCount` sobreviva de una
 * llamada a `handleIncoming` a la siguiente, como en producción.
 */
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    get: jest.fn((key: string) =>
      Promise.resolve(store.has(key) ? (store.get(key) as string) : null),
    ),
    set: jest.fn((key: string, value: string, ...args: unknown[]) => {
      if (args.includes('NX') && store.has(key)) return Promise.resolve(null);
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
  };
}

describe('WhatsappBotService', () => {
  let service: WhatsappBotService;
  let redis: ReturnType<typeof fakeRedis>;
  let serviceTypeRepo: { find: jest.Mock };
  let appointmentsService: { createPublic: jest.Mock };
  let availabilityService: { getAvailableSlots: jest.Mock };
  let whatsapp: { sendText: jest.Mock };
  let routing: { credentialsFor: jest.Mock };
  let conversations: {
    recordInbound: jest.Mock;
    recordOutbound: jest.Mock;
    close: jest.Mock;
    escalate: jest.Mock;
  };

  /** Estado de la conversación que `recordInbound` va a devolver. */
  let conversationState: WhatsappConversationStateEnum;

  let nextMessageId = 1;

  beforeEach(async () => {
    redis = fakeRedis();
    conversationState = WhatsappConversationStateEnum.BOT;
    nextMessageId = 1;

    serviceTypeRepo = {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'st-1', name: 'Cambio de aceite' }]),
    };
    appointmentsService = {
      createPublic: jest.fn().mockResolvedValue({ id: 'appt-1' }),
    };
    availabilityService = {
      getAvailableSlots: jest
        .fn()
        .mockResolvedValue([{ start: '2026-08-22T10:00:00.000Z' }]),
    };
    whatsapp = {
      sendText: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'wamid.out' }),
    };
    routing = {
      credentialsFor: jest
        .fn()
        .mockResolvedValue({ phoneNumberId: '123', token: 'tok' }),
    };
    conversations = {
      recordInbound: jest.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'conv-1',
          state: conversationState,
        }),
      ),
      recordOutbound: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      escalate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappBotService,
        { provide: 'REDIS_CLIENT', useValue: redis },
        { provide: getRepositoryToken(ServiceType), useValue: serviceTypeRepo },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: UserAvailabilityService, useValue: availabilityService },
        { provide: WhatsAppProvider, useValue: whatsapp },
        { provide: WhatsappRoutingService, useValue: routing },
        { provide: WhatsappConversationsService, useValue: conversations },
      ],
    }).compile();

    service = module.get(WhatsappBotService);
  });

  const send = (text: string): Promise<string[]> => {
    const msg: IncomingMessage = {
      waMessageId: `wamid.${nextMessageId++}`,
      from: PHONE,
      type: 'text',
      text,
    };
    return service.handleIncoming(ROUTE, msg);
  };

  describe('el bot se calla con un asesor encima', () => {
    it('no contesta si la conversación ya está con un asesor', async () => {
      conversationState = WhatsappConversationStateEnum.WITH_AGENT;

      const out = await send('hola');

      expect(out).toEqual([]);
      expect(whatsapp.sendText).not.toHaveBeenCalled();
    });
  });

  describe('ASKED_FOR_HUMAN — pedir una persona', () => {
    it('escala cuando el cliente pide hablar con un asesor', async () => {
      await send('quiero hablar con un asesor por favor');

      expect(conversations.escalate).toHaveBeenCalledWith(
        'conv-1',
        WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
      );
    });

    it('escala con "una persona"', async () => {
      await send('me puedes comunicar con una persona');

      expect(conversations.escalate).toHaveBeenCalledWith(
        'conv-1',
        WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
      );
    });

    it('escala con "con alguien"', async () => {
      await send('necesito hablar con alguien del taller');

      expect(conversations.escalate).toHaveBeenCalledWith(
        'conv-1',
        WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
      );
    });

    it('escala con "humano"', async () => {
      await send('quiero que me atienda un humano');

      expect(conversations.escalate).toHaveBeenCalledWith(
        'conv-1',
        WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN,
      );
    });

    it('limpia la sesión del bot y avisa al cliente', async () => {
      const out = await send('hablar con un asesor');

      expect(out).toEqual([
        expect.stringContaining('te comunico con alguien del taller'),
      ]);
      // La sesión quedó borrada: el siguiente "1" no lo interpreta como
      // respuesta a un paso viejo.
      expect(redis.del).toHaveBeenCalled();
    });

    // Los dos falsos positivos que el plan pide evitar explícitamente: una
    // palabra que contiene la frase gatillo pero significa otra cosa.
    it('NO escala con "asesoría" (contiene "asesor" pero es otra palabra)', async () => {
      await send('necesito una asesoría para mi moto');

      expect(conversations.escalate).not.toHaveBeenCalled();
    });

    it('NO escala con "personal" (contiene "persona" pero es otra palabra)', async () => {
      await send('busco atención personal de calidad');

      expect(conversations.escalate).not.toHaveBeenCalled();
    });

    it('NO escala si sólo aparece "persona" sin el artículo "una"', async () => {
      // Bare "persona" no es una de las cuatro frases del plan: es más
      // ambiguo ("cuántas personas cabemos", etc.) y generalizarlo es
      // exactamente el tipo de falso positivo que hay que evitar.
      await send('somos dos personas con motos para servicio');

      expect(conversations.escalate).not.toHaveBeenCalled();
    });

    it('no interrumpe un mensaje normal del flujo', async () => {
      await send('1');

      expect(conversations.escalate).not.toHaveBeenCalled();
    });
  });

  describe('BOT_LOOPED — el bot se repite', () => {
    it('no escala con uno o dos intentos fallidos seguidos', async () => {
      await send('hola'); // arranca el flujo, pide el servicio
      await send('xx'); // inválido (menos de 3 caracteres): 1er fallo
      await send('yy'); // inválido: 2do fallo

      expect(conversations.escalate).not.toHaveBeenCalled();
    });

    it('escala a BOT_LOOPED al tercer intento fallido seguido en el mismo paso', async () => {
      await send('hola');
      await send('xx');
      await send('yy');
      await send('zz');

      expect(conversations.escalate).toHaveBeenCalledWith(
        'conv-1',
        WhatsappEscalationReasonEnum.BOT_LOOPED,
      );
    });

    it('avisa al cliente y deja de usar el flujo numerado', async () => {
      await send('hola');
      await send('xx');
      await send('yy');
      const out = await send('zz');

      expect(out.at(-1)).toEqual(
        expect.stringContaining('avisé a alguien del taller'),
      );
    });

    it('un progreso válido reinicia el contador de intentos fallidos', async () => {
      await send('hola');
      await send('xx'); // 1er fallo
      await send('1'); // avanza a DATE: reinicia el contador
      await send('fecha invalida'); // 1er fallo del nuevo paso
      await send('otra invalida'); // 2do fallo

      expect(conversations.escalate).not.toHaveBeenCalled();
    });
  });

  describe('flujo normal, sin falsos positivos', () => {
    it('agenda una cita completa sin disparar ninguna escalación', async () => {
      await send('hola');
      await send('1'); // elige el servicio
      await send('1'); // hoy
      await send('1'); // el horario
      await send('Juan Pérez'); // nombre
      await send('1'); // confirma

      expect(conversations.escalate).not.toHaveBeenCalled();
      expect(appointmentsService.createPublic).toHaveBeenCalledWith(
        expect.objectContaining({ clientPhone: PHONE }),
        AppointmentOriginEnum.WHATSAPP_BOT,
        'conv-1',
      );
      expect(conversations.close).toHaveBeenCalledWith(
        'conv-1',
        WhatsappConversationStateEnum.BOOKED,
        'appt-1',
      );
    });
  });
});
