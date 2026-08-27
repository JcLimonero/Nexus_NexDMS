import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WhatsappConversationsService } from './whatsapp-conversations.service';
import { FilterConversationsDto } from './dto/filter-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TakeConversationDto } from './dto/take-conversation.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

/**
 * Los chats de WhatsApp, para el taller.
 *
 * Va aparte del controlador del bot a propósito: aquél es el webhook público
 * que expone Meta y se autentica por firma; éste es del DMS y va detrás del
 * token, con el alcance del usuario aplicado.
 */
@ApiTags('WhatsApp Conversations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('whatsapp/conversations')
export class WhatsappConversationsController {
  constructor(private readonly service: WhatsappConversationsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterConversationsDto,
  ) {
    return this.service.findAll(user, filters);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  /** El asesor entra a la conversación; el asistente deja de contestar. */
  @Post(':id/take')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  take(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TakeConversationDto,
  ) {
    return this.service.take(user, id, dto.reason);
  }

  /** La suelta y la devuelve al asistente. */
  @Post(':id/release')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  release(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.release(user, id);
  }

  @Post(':id/messages')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  sendMessage(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(user, id, dto);
  }

  @Post(':id/read')
  @HttpCode(204)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  markRead(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(user, id);
  }
}
