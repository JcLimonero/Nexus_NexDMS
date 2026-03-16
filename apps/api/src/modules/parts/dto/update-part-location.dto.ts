import { IsUUID } from 'class-validator';

export class UpdatePartLocationDto {
  @IsUUID()
  locationId: string;
}
