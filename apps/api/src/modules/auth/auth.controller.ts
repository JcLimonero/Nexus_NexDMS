import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LIMITE_ACCESO } from '../../common/throttler/limites';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';
import { SwitchLegalEntityDto } from './dto/switch-legal-entity.dto';
import type { UserPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  // Cinco por minuto en producción; más holgado en desarrollo, donde el
  // límite estorba más de lo que protege. Ver `common/throttler/limites`.
  @Throttle(LIMITE_ACCESO)
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Marca del cliente para vestir el acceso; pública, sin sesión. */
  @Get('branding/:slug')
  brandingPublico(@Param('slug') slug: string) {
    return this.authService.brandingPublicoPorSlug(slug);
  }

  /** Credenciales de demostración del cliente (solo fuera de producción). */
  @Get('demo-users/:slug')
  demoUsers(@Param('slug') slug: string) {
    return this.authService.demoUsers(slug);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(LIMITE_ACCESO)
  @ApiResponse({ status: 200, description: 'Token renovado' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  logout(@CurrentUser() user: UserPayload) {
    return this.authService.logout(user.sub);
  }

  /**
   * "Entrar como" un cliente: solo un SUPERADMIN puede pedirlo. Devuelve la liga
   * al DMS del cliente con la sesión ya puesta.
   */
  @Post('impersonate/:tenantId')
  @HttpCode(200)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  impersonate(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.authService.impersonate(tenantId);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  changePassword(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: UserPayload) {
    return this.authService.getMe(user);
  }

  @Post('switch-branch')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  switchBranch(@CurrentUser() user: UserPayload, @Body() dto: SwitchBranchDto) {
    return this.authService.switchBranch(user, dto.branchId);
  }

  @Post('switch-legal-entity')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  switchLegalEntity(
    @CurrentUser() user: UserPayload,
    @Body() dto: SwitchLegalEntityDto,
  ) {
    return this.authService.switchLegalEntity(user, dto.legalEntityId);
  }
}
