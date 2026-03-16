import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lastName?: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(300)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @IsOptional()
  @IsBoolean()
  isAuthorized?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
