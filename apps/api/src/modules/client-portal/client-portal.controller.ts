import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClientPortalService } from './client-portal.service';
import type { PortalSession } from './client-portal.service';
import {
  CurrentPortalSession,
  PortalSessionGuard,
} from './portal-session.guard';

/**
 * Acceso al portal. Sin sesión todavía, por eso va con throttling estrecho:
 * son los dos únicos endpoints por los que se puede intentar entrar.
 */
@ApiTags('Portal del cliente — acceso')
@Controller('portal/auth')
export class ClientPortalAuthController {
  constructor(private readonly portal: ClientPortalService) {}

  @Post('codigo')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  solicitar(@Body() dto: { phone: string }) {
    return this.portal.solicitarCodigo(dto.phone);
  }

  @Post('verificar')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  verificar(@Body() dto: { phone: string; code: string }) {
    return this.portal.verificarCodigo(dto.phone, dto.code);
  }
}

@ApiTags('Portal del cliente')
@UseGuards(PortalSessionGuard)
@Controller('portal')
export class ClientPortalController {
  constructor(private readonly portal: ClientPortalService) {}

  @Get('inicio')
  inicio(@CurrentPortalSession() s: PortalSession) {
    return this.portal.inicio(s);
  }

  @Get('vehiculos')
  vehiculos(@CurrentPortalSession() s: PortalSession) {
    return this.portal.misVehiculos(s);
  }

  @Get('ordenes/:id')
  orden(
    @CurrentPortalSession() s: PortalSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.portal.miOrden(s, id);
  }

  @Get('citas')
  citas(@CurrentPortalSession() s: PortalSession) {
    return this.portal.misCitas(s);
  }

  @Get('documentos')
  documentos(@CurrentPortalSession() s: PortalSession) {
    return this.portal.misDocumentos(s);
  }

  @Get('encuestas')
  encuestas(@CurrentPortalSession() s: PortalSession) {
    return this.portal.misEncuestas(s);
  }

  // ─── Conversación con el asesor ─────────────────────────────

  @Get('ordenes/:id/mensajes')
  mensajes(
    @CurrentPortalSession() s: PortalSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.portal.mensajes(s, id);
  }

  @Post('ordenes/:id/mensajes')
  escribir(
    @CurrentPortalSession() s: PortalSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { body: string },
  ) {
    return this.portal.escribir(s, id, dto.body);
  }
}
