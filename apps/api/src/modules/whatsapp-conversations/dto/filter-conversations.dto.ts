import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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

  /**
   * Sólo las que tuvieron que escalar (`escalation_reason` no nulo).
   *
   * Para el badge "N de M escalaron": el conteo tiene que salir de
   * `meta.total` de una consulta al servidor, no de contar la página que ya
   * se cargó — eso da un número distinto en cuanto alguien pagina.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  escalated?: boolean;
}
