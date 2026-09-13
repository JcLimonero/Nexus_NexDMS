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
import { UnitReservationsService } from './unit-reservations.service';
import { ComprobanteApartadoPdfService } from './comprobante-apartado-pdf.service';
import { DocumentoCorreoService } from '../../common/document-mail/documento-correo.service';
import { CreateUnitReservationDto } from './dto/create-unit-reservation.dto';
import { ReleaseUnitReservationDto } from './dto/release-unit-reservation.dto';
import { FilterUnitReservationsDto } from './dto/filter-unit-reservations.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Reservations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-reservations')
export class UnitReservationsController {
  constructor(
    private readonly unitReservationsService: UnitReservationsService,
    private readonly apartadoPdf: ComprobanteApartadoPdfService,
    private readonly correo: DocumentoCorreoService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterUnitReservationsDto,
  ) {
    return this.unitReservationsService.findAll(user, filters);
  }

  /**
   * El comprobante de apartado en papel: el acuse del anticipo que se entrega
   * al cliente. Va `inline` para revisarlo antes de imprimirlo o firmarlo.
   */
  @Get(':id/pdf')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  async pdf(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.apartadoPdf.generar(
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

  /** Envía el comprobante de apartado por correo al cliente con el PDF adjunto. */
  @Post(':id/email')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  async enviarCorreo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email?: string; mensaje?: string },
  ) {
    const doc = await this.apartadoPdf.generar(user.tenantId, id);
    return this.correo.enviar({
      to: body.email || doc.clientEmail || '',
      negocio: doc.negocio,
      tipo: 'Comprobante de apartado',
      folio: doc.folio,
      filename: doc.filename,
      buffer: doc.buffer,
      mensaje: body.mensaje,
    });
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitReservationsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateUnitReservationDto,
  ) {
    return this.unitReservationsService.create(user, dto);
  }

  @Post(':id/release')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  release(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseUnitReservationDto,
  ) {
    return this.unitReservationsService.release(user, id, dto.reason);
  }
}
