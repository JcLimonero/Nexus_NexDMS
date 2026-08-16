import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomRolesService } from './custom-roles.service';
import {
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
} from './dto/custom-role.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Custom Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('custom-roles')
export class CustomRolesController {
  constructor(private readonly service: CustomRolesService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.findAll(user, tenantId);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateCustomRoleDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomRoleDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN')
  remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user, id);
  }
}
