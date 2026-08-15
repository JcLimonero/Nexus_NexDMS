import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CountLineInput {
  @IsUUID()
  lineId: string;

  @IsInt()
  @Min(0)
  countedQty: number;
}

export class SaveCountsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CountLineInput)
  lines: CountLineInput[];
}
