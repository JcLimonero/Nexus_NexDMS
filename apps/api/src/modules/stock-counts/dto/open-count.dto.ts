import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OpenCountDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
