import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CancelCfdiDto {
  @IsString()
  @IsIn(['01', '02', '03', '04'])
  motivoCancelacion: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cfdiSustitucionId?: string;
}
