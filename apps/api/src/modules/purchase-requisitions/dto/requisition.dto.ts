import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRequisitionDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/** Convierte varias requisiciones pendientes en una orden de compra. */
export class ConvertRequisitionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  requisitionIds: string[];

  @IsUUID()
  supplierId: string;
}
