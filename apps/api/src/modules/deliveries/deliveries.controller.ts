import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliveriesService } from './deliveries.service';
import { ComprobanteEntregaPdfService } from './comprobante-entrega-pdf.service';
import { DocumentoCorreoService } from '../../common/document-mail/documento-correo.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryKindEnum } from './entities/delivery.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(
    private readonly service: DeliveriesService,
    private readonly entregaPdf: ComprobanteEntregaPdfService,
    private readonly correo: DocumentoCorreoService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('kind') kind?: DeliveryKindEnum,
  ) {
    return this.service.findAll(user, kind);
  }

  /** Plantilla de checklist por tipo (para prellenar). */
  @Get('template/:kind')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  template(@Param('kind') kind: DeliveryKindEnum) {
    return this.service.plantilla(kind);
  }

  /**
   * Comprobante de entrega en papel: el acuse que firma el cliente al recibir
   * la unidad o el vehículo del taller. Va `inline` para revisarlo en pantalla
   * antes de imprimirlo o hacer que lo firme.
   */
  @Get(':id/pdf')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  async pdf(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.entregaPdf.generar(
      user.tenantId,
      id,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  /** Envía el comprobante de entrega por correo al cliente con el PDF adjunto. */
  @Post(':id/email')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  async enviarCorreo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email?: string; mensaje?: string },
  ) {
    const doc = await this.entregaPdf.generar(user.tenantId, id);
    return this.correo.enviar({
      to: body.email || doc.clientEmail || '',
      negocio: doc.negocio,
      tipo: 'Comprobante de entrega',
      folio: doc.folio,
      filename: doc.filename,
      buffer: doc.buffer,
      mensaje: body.mensaje,
    });
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateDeliveryDto) {
    return this.service.create(user, dto);
  }
}
