import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MechanicChecklistService } from './mechanic-checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Mechanic Checklist')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('mechanic-checklist')
export class MechanicChecklistController {
  constructor(
    private readonly mechanicChecklistService: MechanicChecklistService,
  ) {}

  @Get('items')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  findItems(@CurrentUser() user: UserPayload) {
    return this.mechanicChecklistService.findItems(user);
  }

  @Post('items')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createItem(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.mechanicChecklistService.createItem(user, dto);
  }
}
