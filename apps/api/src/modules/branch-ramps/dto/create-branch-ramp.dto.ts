import { IsString, MaxLength } from 'class-validator';

export class CreateBranchRampDto {
  @IsString()
  @MaxLength(100)
  name: string;
}
