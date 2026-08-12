import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AnswerSurveyDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
