import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from '../service-orders/entities/service-order.entity';
import { ServiceOrderUpdate } from '../service-orders/entities/service-order-update.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import { AnswerSurveyDto } from './dto/answer-survey.dto';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recibida',
  DIAGNOSIS: 'En diagnóstico',
  IN_PROGRESS: 'En reparación',
  WAITING_PARTS: 'Esperando refacciones',
  READY: 'Lista para entrega',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

/** Orden de progreso para pintar el timeline público. */
const STATUS_FLOW = [
  ServiceOrderStatusEnum.RECEIVED,
  ServiceOrderStatusEnum.DIAGNOSIS,
  ServiceOrderStatusEnum.IN_PROGRESS,
  ServiceOrderStatusEnum.READY,
  ServiceOrderStatusEnum.DELIVERED,
];

@Injectable()
export class PublicPortalService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ServiceOrderUpdate)
    private readonly updateRepo: Repository<ServiceOrderUpdate>,
    @InjectRepository(ServiceSurvey)
    private readonly surveyRepo: Repository<ServiceSurvey>,
  ) {}

  /** Tracking público: datos sanitizados, sin información sensible. */
  async getTracking(token: string) {
    const so = await this.soRepo.findOne({
      where: { trackingToken: token },
      relations: ['vehicle', 'branch', 'owner', 'user'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const updates = await this.updateRepo.find({
      where: { serviceOrderId: so.id },
      order: { createdAt: 'ASC' },
    });

    const currentIdx = STATUS_FLOW.indexOf(so.status);
    const steps = STATUS_FLOW.map((s, i) => ({
      status: s,
      label: STATUS_LABELS[s],
      done: currentIdx >= 0 ? i <= currentIdx : false,
      current: s === so.status,
    }));

    const vehicle = so.vehicle as unknown as Record<string, unknown> | null;
    return {
      folio: so.folio,
      status: so.status,
      statusLabel: STATUS_LABELS[so.status] ?? so.status,
      cancelled: so.status === ServiceOrderStatusEnum.CANCELLED,
      receivedAt: so.createdAt,
      readyAt: so.readyAt ?? null,
      deliveredAt: so.deliveredAt ?? null,
      vehicle: vehicle
        ? {
            brand: (vehicle['make'] ?? vehicle['brand'] ?? null) as
              | string
              | null,
            model: (vehicle['model'] ?? null) as string | null,
            plate: (vehicle['plate'] ?? null) as string | null,
          }
        : null,
      branch: so.branch
        ? {
            name: so.branch.name,
            phone: so.branch.aftersalesPhone ?? so.branch.counterPhone ?? null,
          }
        : null,
      /*
       * Quién atiende su unidad.
       *
       * Es `user` y no el asesor de la cita porque `user` es quien la recibió,
       * es decir con quien el cliente habló en el mostrador; si la cita se
       * repartió a otro y al final la tomó éste, el cliente busca a éste.
       *
       * El teléfono y el correo salen solo si están capturados en la ficha del
       * empleado. En un taller ahí va la extensión o el móvil de trabajo, no
       * el personal; si está vacío queda el de la sucursal, que siempre está.
       */
      advisor: so.user
        ? {
            name: [so.user.firstName, so.user.lastName]
              .filter(Boolean)
              .join(' '),
            phone: so.user.phone ?? null,
            email: so.user.email ?? null,
          }
        : null,
      steps,
      updates: updates.map((u) => ({
        message: u.message,
        createdAt: u.createdAt,
      })),
    };
  }

  async getSurvey(token: string) {
    const survey = await this.surveyRepo.findOne({
      where: { token },
      relations: ['serviceOrder'],
    });
    if (!survey) throw new NotFoundException('Encuesta no encontrada');
    return {
      folio: survey.serviceOrder?.folio ?? null,
      answered: survey.answeredAt !== null,
      score: survey.score,
      intro: survey.intro,
      thanks: survey.thanks,
      questions: survey.questions ?? [],
    };
  }

  async answerSurvey(token: string, dto: AnswerSurveyDto) {
    const survey = await this.surveyRepo.findOne({ where: { token } });
    if (!survey) throw new NotFoundException('Encuesta no encontrada');
    if (survey.answeredAt) {
      throw new BadRequestException('Esta encuesta ya fue respondida');
    }

    if (dto.answers && survey.questions?.length) {
      // Encuesta configurable: promedio de las preguntas de puntaje.
      const ratingIds = survey.questions
        .filter((q) => q.type === 'RATING')
        .map((q) => q.id);
      const ratings = ratingIds
        .map((id) => Number(dto.answers?.[id]))
        .filter((n) => Number.isFinite(n) && n > 0);
      survey.answers = dto.answers;
      survey.score =
        ratings.length > 0
          ? Math.round(ratings.reduce((a, n) => a + n, 0) / ratings.length)
          : null;
    } else {
      // Encuesta clásica de puntaje único.
      survey.score = dto.score ?? null;
      survey.comment = dto.comment?.trim() || null;
    }
    survey.answeredAt = new Date();
    await this.surveyRepo.save(survey);
    return { ok: true, thanks: survey.thanks };
  }
}
