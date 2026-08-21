import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBranchConfigDto {
  /** `phone_number_id` de Meta. Se guarda en claro: con él se enruta el webhook. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsappPhoneNumberId?: string;

  @IsOptional()
  @IsString()
  whatsappToken?: string;

  @IsOptional()
  @IsString()
  facturaapiApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  bankClabe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bankHolder?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cfdiLastFolio?: number;
}
