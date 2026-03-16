import { IsInt, IsUUID, Min } from 'class-validator';

export class AddPartDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
