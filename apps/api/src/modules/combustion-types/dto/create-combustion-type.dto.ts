import { IsString, MaxLength } from 'class-validator';

export class CreateCombustionTypeDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  label: string;
}
