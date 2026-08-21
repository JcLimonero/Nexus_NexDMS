import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WhatsappConversationStateEnum } from '../entities/whatsapp-conversation.entity';

export class FilterConversationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(WhatsappConversationStateEnum)
  state?: WhatsappConversationStateEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  /** Busca por nombre de contacto o teléfono. */
  @IsOptional()
  @IsString()
  q?: string;
}
