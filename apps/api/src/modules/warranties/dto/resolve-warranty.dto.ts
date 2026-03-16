import { IsString } from 'class-validator';

export class ResolveWarrantyDto {
  @IsString()
  resolution: string;
}
