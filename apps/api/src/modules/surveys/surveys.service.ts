import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SurveyAreaEnum,
  SurveyConfig,
  SurveyQuestion,
} from './entities/survey-config.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

/** Encuestas por defecto si el tenant aún no configuró el área. */
const DEFAULTS: Record<
  SurveyAreaEnum,
  { intro: string; thanks: string; questions: SurveyQuestion[] }
> = {
  [SurveyAreaEnum.SERVICE]: {
    intro: 'Cuéntanos cómo fue tu experiencia en el taller.',
    thanks: '¡Gracias por tu opinión!',
    questions: [
      { id: 'q1', label: '¿Qué tan satisfecho quedó con el servicio?', type: 'RATING' },
      { id: 'q2', label: '¿El asesor le explicó los trabajos con claridad?', type: 'RATING' },
      { id: 'q3', label: '¿La unidad se entregó a tiempo?', type: 'RATING' },
      { id: 'q4', label: 'Comentarios', type: 'TEXT' },
    ],
  },
  [SurveyAreaEnum.SALES]: {
    intro: 'Cuéntanos cómo fue tu experiencia de compra.',
    thanks: '¡Gracias por confiar en nosotros!',
    questions: [
      { id: 'q1', label: '¿Qué tan satisfecho quedó con su compra?', type: 'RATING' },
      { id: 'q2', label: '¿Cómo fue la atención del asesor de ventas?', type: 'RATING' },
      { id: 'q3', label: '¿La entrega de la unidad cumplió lo prometido?', type: 'RATING' },
      { id: 'q4', label: '¿Recomendaría la agencia?', type: 'RATING' },
      { id: 'q5', label: 'Comentarios', type: 'TEXT' },
    ],
  },
};

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(SurveyConfig)
    private readonly repo: Repository<SurveyConfig>,
  ) {}

  /** Config del área; si no existe, devuelve la plantilla por defecto. */
  async getConfig(
    tenantId: string,
    area: SurveyAreaEnum,
  ): Promise<SurveyConfig> {
    const found = await this.repo.findOne({ where: { tenantId, area } });
    if (found) return found;
    const def = DEFAULTS[area];
    return this.repo.create({
      tenantId,
      area,
      intro: def.intro,
      thanks: def.thanks,
      questions: def.questions,
      isActive: true,
    });
  }

  async setConfig(
    user: UserPayload,
    area: SurveyAreaEnum,
    dto: {
      intro?: string | null;
      thanks?: string | null;
      questions?: SurveyQuestion[];
      isActive?: boolean;
    },
  ): Promise<SurveyConfig> {
    let cfg = await this.repo.findOne({
      where: { tenantId: user.tenantId, area },
    });
    if (!cfg) {
      cfg = this.repo.create({ tenantId: user.tenantId, area });
    }
    if (dto.intro !== undefined) cfg.intro = dto.intro;
    if (dto.thanks !== undefined) cfg.thanks = dto.thanks;
    if (dto.questions !== undefined) cfg.questions = dto.questions;
    if (dto.isActive !== undefined) cfg.isActive = dto.isActive;
    return this.repo.save(cfg);
  }
}
