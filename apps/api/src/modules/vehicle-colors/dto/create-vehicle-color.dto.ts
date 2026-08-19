import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateVehicleColorDto {
  @IsUUID()
  brandId: string;

  @IsUUID()
  modelId: string;

  @IsUUID()
  versionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(['INTERIOR', 'EXTERIOR'])
  colorType: 'INTERIOR' | 'EXTERIOR';
}
