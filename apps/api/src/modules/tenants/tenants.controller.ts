import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('SUPERADMIN')
  findAll(@CurrentUser() user: UserPayload) {
    return this.tenantsService.findAll(user);
  }

  @Get(':id')
  @Roles('SUPERADMIN')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tenantsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(user, id, dto);
  }

  @Patch(':id/suspend')
  @Roles('SUPERADMIN')
  suspend(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tenantsService.suspend(user, id);
  }
}
