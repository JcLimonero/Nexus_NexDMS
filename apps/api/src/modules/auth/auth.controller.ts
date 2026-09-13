import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  limpiarCookiesSesion,
  ponerCookiesSesion,
} from '../../common/auth/cookies';
import { Throttle } from '@nestjs/throttler';
import { LIMITE_ACCESO } from '../../common/throttler/limites';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.authService.login(dto);
    // El token también viaja en cookie httpOnly; el cuerpo se conserva para las
    // apps aún no migradas (modo dual durante la migración).
    if ('accessToken' in r && r.accessToken) {
      ponerCookiesSesion(res, r.accessToken);
    }
    return r;
  }

  /** Solicita el correo de recuperación de contraseña (público). */
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle(LIMITE_ACCESO)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** Fija la nueva contraseña con el token del correo (público). */
  @Post('reset-password')
  @HttpCode(200)
  @Throttle(LIMITE_ACCESO)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.authService.refresh(refreshToken);
    if (r?.accessToken) ponerCookiesSesion(res, r.accessToken);
    return r;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  async logout(
    @CurrentUser() user: UserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    limpiarCookiesSesion(res);
    await this.authService.logout(user.sub);
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

  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  subirAvatar(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.subirAvatar(user, file);
  }

  @Delete('me/avatar')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  quitarAvatar(@CurrentUser() user: UserPayload) {
    return this.authService.quitarAvatar(user);
  }

  @Post('switch-branch')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  async switchBranch(
    @CurrentUser() user: UserPayload,
    @Body() dto: SwitchBranchDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.authService.switchBranch(user, dto.branchId);
    if (r?.accessToken) ponerCookiesSesion(res, r.accessToken);
    return r;
  }

  @Post('switch-legal-entity')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  async switchLegalEntity(
    @CurrentUser() user: UserPayload,
    @Body() dto: SwitchLegalEntityDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.authService.switchLegalEntity(user, dto.legalEntityId);
    if (r?.accessToken) ponerCookiesSesion(res, r.accessToken);
    return r;
  }
}
