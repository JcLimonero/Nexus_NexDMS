import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentOriginEnum } from '../appointments/entities/appointment.entity';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { WhatsappConversationsService } from '../whatsapp-conversations/whatsapp-conversations.service';
import { WhatsappEscalationReasonEnum } from '../whatsapp-conversations/entities/whatsapp-conversation.entity';
import { StorageService } from '../../common/storage/storage.service';
import { GeminiClient } from './gemini.client';
import { WhatsappAssistantService } from './whatsapp-assistant.service';

const CTX = {
  branchId: 'branch-1',
  branchSlug: 'central',
  conversationId: 'conv-1',
  phone: '5218112345678',
};

describe('WhatsappAssistantService', () => {
  let service: WhatsappAssistantService;
  let gemini: { isConfigured: boolean; generate: jest.Mock };
  let serviceTypeRepo: { find: jest.Mock };
  let branchRepo: { findOne: jest.Mock };
  let availability: { getAvailableSlots: jest.Mock };
  let appointments: { createPublic: jest.Mock };
  let conversations: {
    getRecentMessagesForAssistant: jest.Mock;
    escalate: jest.Mock;
  };
  let storage: { download: jest.Mock };

  beforeEach(async () => {
    gemini = { isConfigured: true, generate: jest.fn() };
    serviceTypeRepo = { find: jest.fn().mockResolvedValue([]) };
    branchRepo = {
      findOne: jest.fn().mockResolvedValue({ timezone: 'America/Mexico_City' }),
    };
    availability = { getAvailableSlots: jest.fn().mockResolvedValue([]) };
    appointments = {
      createPublic: jest.fn().mockResolvedValue({ id: 'appt-1' }),
    };
    conversations = {
      getRecentMessagesForAssistant: jest.fn().mockResolvedValue([]),
      escalate: jest.fn().mockResolvedValue(undefined),
    };
    storage = { download: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappAssistantService,
        { provide: GeminiClient, useValue: gemini },
        { provide: getRepositoryToken(ServiceType), useValue: serviceTypeRepo },
        { provide: getRepositoryToken(Branch), useValue: branchRepo },
        { provide: UserAvailabilityService, useValue: availability },
        { provide: AppointmentsService, useValue: appointments },
        { provide: WhatsappConversationsService, useValue: conversations },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(WhatsappAssistantService);
  });

  it('devuelve null cuando el primer intento no da texto ni herramientas: quien llama cae al flujo de menús', async () => {
    gemini.generate.mockResolvedValue(null);

    const result = await service.respond(CTX);

    expect(result).toBeNull();
  });

  it('regresa el texto simple cuando el modelo no pide ninguna herramienta', async () => {
    gemini.generate.mockResolvedValue({
      text: '¡Hola! ¿En qué te ayudo?',
      toolCalls: [],
    });

    const result = await service.respond(CTX);

    expect(result).toEqual({
      replies: ['¡Hola! ¿En qué te ayudo?'],
      escalated: false,
      appointmentId: undefined,
    });
  });

  it('ejecuta consultar_disponibilidad contra el servicio real y le da el resultado al modelo', async () => {
    availability.getAvailableSlots.mockResolvedValue([
      { start: '2026-08-25T10:00:00.000Z' },
    ]);
    gemini.generate
      .mockResolvedValueOnce({
        text: 'Déjame ver qué horarios hay',
        toolCalls: [
          {
            name: 'consultar_disponibilidad',
            args: { fecha: '2026-08-25' },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: 'Tengo las 10:00, ¿te queda bien?',
        toolCalls: [],
      });

    const result = await service.respond(CTX);

    expect(availability.getAvailableSlots).toHaveBeenCalledWith(
      'branch-1',
      '2026-08-25',
      undefined,
      undefined,
      undefined,
    );
    const segundaLlamada = gemini.generate.mock.calls[1][0];
    expect(segundaLlamada.toolResults).toEqual([
      {
        name: 'consultar_disponibilidad',
        result: {
          horarios: [
            { inicio: '2026-08-25T10:00:00.000Z', hora_local: '4:00 a.m.' },
          ],
        },
      },
    ]);
    expect(result?.replies).toEqual([
      'Déjame ver qué horarios hay',
      'Tengo las 10:00, ¿te queda bien?',
    ]);
  });

  it('agenda de verdad con agendar_cita y regresa el appointmentId para cerrar la conversación', async () => {
    gemini.generate
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [
          {
            name: 'agendar_cita',
            args: {
              inicio: '2026-08-25T10:00:00.000Z',
              servicio: 'Cambio de aceite',
              nombre_cliente: 'Juan Pérez',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: '¡Listo, tu cita quedó agendada!',
        toolCalls: [],
      });

    const result = await service.respond(CTX);

    expect(appointments.createPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        branchSlug: 'central',
        clientPhone: CTX.phone,
        clientName: 'Juan Pérez',
      }),
      AppointmentOriginEnum.WHATSAPP_BOT,
      'conv-1',
    );
    expect(result?.appointmentId).toBe('appt-1');
    expect(result?.replies).toEqual(['¡Listo, tu cita quedó agendada!']);
  });

  it('escala con escalar_a_persona y no le pide otra vuelta al modelo', async () => {
    gemini.generate.mockResolvedValueOnce({
      text: 'Ahora te comunico con alguien del taller.',
      toolCalls: [
        { name: 'escalar_a_persona', args: { motivo: 'BOT_WAS_WRONG' } },
      ],
    });

    const result = await service.respond(CTX);

    expect(conversations.escalate).toHaveBeenCalledWith(
      'conv-1',
      WhatsappEscalationReasonEnum.BOT_WAS_WRONG,
    );
    expect(result?.escalated).toBe(true);
    expect(gemini.generate).toHaveBeenCalledTimes(1);
  });

  it('si el modelo falla después de ya haber agendado, no finge que no pasó nada: avisa y escala', async () => {
    gemini.generate
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [
          {
            name: 'agendar_cita',
            args: {
              inicio: '2026-08-25T10:00:00.000Z',
              servicio: 'Cambio de aceite',
              nombre_cliente: 'Juan Pérez',
            },
          },
        ],
      })
      .mockResolvedValueOnce(null);

    const result = await service.respond(CTX);

    expect(result).not.toBeNull();
    expect(result?.appointmentId).toBe('appt-1');
    expect(result?.escalated).toBe(true);
    expect(conversations.escalate).toHaveBeenCalledWith(
      'conv-1',
      WhatsappEscalationReasonEnum.BOT_WAS_WRONG,
    );
  });

  it('escala a BOT_LOOPED si se acaban las vueltas sin una respuesta final', async () => {
    gemini.generate.mockResolvedValue({
      text: '',
      toolCalls: [{ name: 'listar_servicios', args: {} }],
    });

    const result = await service.respond(CTX);

    expect(conversations.escalate).toHaveBeenCalledWith(
      'conv-1',
      WhatsappEscalationReasonEnum.BOT_LOOPED,
    );
    expect(result?.escalated).toBe(true);
  });
});
