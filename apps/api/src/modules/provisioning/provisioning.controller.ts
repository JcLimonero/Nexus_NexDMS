import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ProvisioningService } from './provisioning.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';

/**
 * Alta guiada de empresas (wizard). Solo superadmin de Nexus.
 */
@ApiTags('provisioning')
@ApiBearerAuth()
@UseGuards(AuthGuard, PlatformAdminGuard, RolesGuard)
@Controller('provisioning')
export class ProvisioningController {
  constructor(private readonly service: ProvisioningService) {}

  @Post('tenant')
  @Roles('SUPERADMIN')
  provision(
    @CurrentUser() user: UserPayload,
    @Body() dto: ProvisionTenantDto,
  ) {
    return this.service.provision(user, dto);
  }
}
