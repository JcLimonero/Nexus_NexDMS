import { IsOptional, IsString } from 'class-validator';

export class UpdatePartNotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
