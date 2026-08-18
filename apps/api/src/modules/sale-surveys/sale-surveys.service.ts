import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleSurvey } from './entities/sale-survey.entity';
import { SurveysService } from '../surveys/surveys.service';
import { SurveyAreaEnum } from '../surveys/entities/survey-config.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class SaleSurveysService {
  constructor(
    @InjectRepository(SaleSurvey)
    private readonly repo: Repository<SaleSurvey>,
    private readonly surveysService: SurveysService,
  ) {}

  async findAll(user: UserPayload): Promise<SaleSurvey[]> {
    return this.repo.find({
      where: { tenantId: user.tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Crea la encuesta de una venta tomando las preguntas configuradas (SALES)
   * como snapshot. Devuelve la encuesta con su token para el link público.
   */
  async create(
    user: UserPayload,
    dto: { referenceLabel?: string; clientName?: string; branchId?: string },
  ): Promise<SaleSurvey> {
    const branchId = dto.branchId ?? user.branchId;
    if (!branchId) {
      throw new BadRequestException('Se requiere sucursal para la encuesta');
    }
    const config = await this.surveysService.getConfig(
      user.tenantId,
      SurveyAreaEnum.SALES,
    );
    const survey = this.repo.create({
      tenantId: user.tenantId,
      branchId,
      referenceLabel: dto.referenceLabel ?? null,
      clientName: dto.clientName ?? null,
      intro: config.intro,
      thanks: config.thanks,
      questions: config.questions,
      answers: {},
      sentAt: new Date(),
      createdBy: user.sub,
    });
    return this.repo.save(survey);
  }

  /** Resumen: promedio general y por pregunta de puntaje (respondidas). */
  async resumen(user: UserPayload) {
    const answered = await this.repo.find({
      where: { tenantId: user.tenantId },
    });
    const respondidas = answered.filter((s) => s.answeredAt);
    const total = answered.length;
    const promedio =
      respondidas.length > 0
        ? Math.round(
            (respondidas.reduce((a, s) => a + (s.score ?? 0), 0) /
              respondidas.length) *
              10,
          ) / 10
        : null;
    return {
      total,
      respondidas: respondidas.length,
      promedio,
    };
  }

  // ─── Público (por token) ────────────────────────────────────

  async getPublic(token: string) {
    const survey = await this.repo.findOne({ where: { token } });
    if (!survey) throw new NotFoundException('Encuesta no encontrada');
    return {
      intro: survey.intro,
      thanks: survey.thanks,
      questions: survey.questions,
      answered: survey.answeredAt !== null,
    };
  }

  async answerPublic(token: string, answers: Record<string, number | string>) {
    const survey = await this.repo.findOne({ where: { token } });
    if (!survey) throw new NotFoundException('Encuesta no encontrada');
    if (survey.answeredAt) {
      throw new BadRequestException('Esta encuesta ya fue respondida');
    }
    // Promedio de las preguntas de puntaje.
    const ratingIds = survey.questions
      .filter((q) => q.type === 'RATING')
      .map((q) => q.id);
    const ratings = ratingIds
      .map((id) => Number(answers[id]))
      .filter((n) => Number.isFinite(n) && n > 0);
    survey.answers = answers;
    survey.score =
      ratings.length > 0
        ? Math.round(ratings.reduce((a, n) => a + n, 0) / ratings.length)
        : null;
    survey.answeredAt = new Date();
    await this.repo.save(survey);
    return { ok: true, thanks: survey.thanks };
  }
}
