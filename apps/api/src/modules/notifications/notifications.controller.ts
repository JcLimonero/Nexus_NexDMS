import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  NotificationChannelEnum,
  NotificationStatusEnum,
} from './entities/notification-log.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('log')
  getLog(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
    @Query('channel') channel?: NotificationChannelEnum,
    @Query('status') status?: NotificationStatusEnum,
    @Query('referenceType') referenceType?: string,
    @Query('referenceId') referenceId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getLog(user, {
      branchId,
      channel,
      status,
      referenceType,
      referenceId,
      page,
      limit,
    });
  }

  @Post('reenviar/:id')
  resend(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.notificationsService.resend(user, id);
  }
}
