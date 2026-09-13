import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import type { Response } from 'express';
import { SalesService } from './sales.service';
import { ReciboVentaPdfService } from './recibo-venta-pdf.service';
import type { FormatoRecibo } from './recibo-venta-pdf.service';
import { DocumentoCorreoService } from '../../common/document-mail/documento-correo.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FilterSalesDto } from './dto/filter-sales.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly reciboPdf: ReciboVentaPdfService,
    private readonly correo: DocumentoCorreoService,
  ) {}

  /** Recibo/ticket de la venta en PDF. `?formato=ticket` para 80 mm. */
  @Get(':id/recibo')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER', 'WAREHOUSE')
  async recibo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('formato') formato: FormatoRecibo = 'carta',
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.reciboPdf.generar(
      user.tenantId,
      id,
      formato === 'ticket' ? 'ticket' : 'carta',
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  /** Envía el recibo de la venta por correo (formato carta). */
  @Post(':id/recibo/email')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  async enviarRecibo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email?: string; mensaje?: string },
  ) {
    const doc = await this.reciboPdf.generar(user.tenantId, id, 'carta');
    return this.correo.enviar({
      to: body.email || doc.clientEmail || '',
      negocio: doc.negocio,
      tipo: 'Recibo de venta',
      folio: doc.folio,
      filename: doc.filename,
      buffer: doc.buffer,
      mensaje: body.mensaje,
    });
  }

  @Get()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'SELLER',
    'AUDITOR',
    'EXECUTIVE',
  )
  findAll(@CurrentUser() user: UserPayload, @Query() filters: FilterSalesDto) {
    return this.salesService.findAll(user, filters);
  }

  @Get(':id')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'SELLER',
    'AUDITOR',
    'EXECUTIVE',
  )
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'CASHIER', 'SELLER')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiResponse({ status: 201, description: 'Venta creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o caja cerrada' })
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user, dto);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: CancelSaleDto,
  ) {
    return this.salesService.cancel(user, id, dto);
  }
}
