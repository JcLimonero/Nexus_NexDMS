import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBranchConfigDto {
  @IsOptional()
  @IsString()
  whatsappPhoneId?: string;

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
