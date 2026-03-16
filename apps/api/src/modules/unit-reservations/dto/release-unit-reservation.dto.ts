import { IsString } from 'class-validator';

export class ReleaseUnitReservationDto {
  @IsString()
  reason: string;
}
