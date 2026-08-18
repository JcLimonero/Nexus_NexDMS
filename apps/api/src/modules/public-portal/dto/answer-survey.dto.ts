import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AnswerSurveyDto {
  /** Encuesta clásica de puntaje único (retrocompatible). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  /** Encuesta configurable: respuestas por id de pregunta. */
  @IsOptional()
  @IsObject()
  answers?: Record<string, number | string>;
}
