import { IsOptional, IsString } from 'class-validator';

export class CreateUpdateDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  status?: string;
}
