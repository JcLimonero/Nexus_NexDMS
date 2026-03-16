import { IsOptional, IsUUID } from 'class-validator';

export class UpdatePartLocationDto {
  @IsOptional()
  @IsUUID()
  locationId?: string | null;
}
