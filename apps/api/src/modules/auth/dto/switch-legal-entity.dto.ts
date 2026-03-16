import { IsUUID } from 'class-validator';

export class SwitchLegalEntityDto {
  @IsUUID()
  legalEntityId: string;
}
