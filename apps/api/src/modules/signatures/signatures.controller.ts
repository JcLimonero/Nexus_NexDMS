import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { SignaturesService } from './signatures.service';
import { SignatureKindEnum } from './entities/document-signature.entity';

@ApiTags('Firmas')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @Get('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  estado(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.signatures.estado(user, id);
  }

  /** Firma en el mostrador, sobre la pantalla del asesor. */
  @Post('order/:serviceOrderId/presencial')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  firmarPresencial(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { kind: SignatureKindEnum; signerName?: string; dataUrl: string },
    @Ip() ip: string,
  ) {
    return this.signatures.firmarPresencial(user, id, dto, ip);
  }

  /** Genera el enlace y se lo manda al cliente por WhatsApp. */
  @Post('order/:serviceOrderId/remota')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  solicitarRemota(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { kind: SignatureKindEnum },
  ) {
    return this.signatures.solicitarRemota(user, id, dto);
  }
}

/**
 * Firma remota. Va sin autenticación a propósito: quien firma es el cliente,
 * y su credencial es el token del enlace, que se quema al usarse.
 */
@ApiTags('Firma remota (público)')
@Controller('public/signatures')
export class PublicSignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @Get(':token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  documento(@Param('token') token: string) {
    return this.signatures.documentoPublico(token);
  }

  @Post(':token')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  firmar(
    @Param('token') token: string,
    @Body() dto: { signerName?: string; dataUrl: string },
    @Ip() ip: string,
  ) {
    return this.signatures.firmarRemota(token, dto, ip);
  }
}
