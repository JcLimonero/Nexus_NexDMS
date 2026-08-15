import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleMapService } from './role-map.service';

@ApiTags('Role Map')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('role-map')
export class RoleMapController {
  constructor(private readonly roleMapService: RoleMapService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN')
  build() {
    return this.roleMapService.build();
  }
}
