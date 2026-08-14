import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { RoleEnum, ScopeEnum } from './entities/user.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** La plantilla del grupo con sus roles y sucursales. */
  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  listar(
    @CurrentUser() user: UserPayload,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.usersService.listar(
      user.tenantId,
      incluirInactivos !== 'false',
    );
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN')
  actualizar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      scope?: ScopeEnum;
      isActive?: boolean;
      roles?: RoleEnum[];
      branchIds?: string[];
    },
  ) {
    // Se pasa quién edita para impedir que alguien se deje a sí mismo sin
    // administración o sin cuenta.
    return this.usersService.actualizar(user.tenantId, id, dto, user.sub);
  }

  /** Suspende o reactiva; el backend alterna según el estado actual. */
  @Patch(':id/activo')
  @Roles('SUPERADMIN', 'ADMIN')
  alternarActivo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.alternarActivo(user.tenantId, id, user.sub);
  }

  @Patch(':id/contrasena')
  @Roles('SUPERADMIN', 'ADMIN')
  restablecerContrasena(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { password: string },
  ) {
    return this.usersService.restablecerContrasena(
      user.tenantId,
      id,
      dto.password,
    );
  }
}
