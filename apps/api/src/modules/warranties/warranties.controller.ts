import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { WarrantiesService } from './warranties.service';
import { CartaGarantiaPdfService } from './carta-garantia-pdf.service';
import { WarrantyEvidenceService } from './warranty-evidence.service';
import { DocumentoCorreoService } from '../../common/document-mail/documento-correo.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { FilterWarrantiesDto } from './dto/filter-warranties.dto';
import { AuthorizeWarrantyDto } from './dto/authorize-warranty.dto';
import { ResolveWarrantyDto } from './dto/resolve-warranty.dto';
import { RejectWarrantyDto } from './dto/reject-warranty.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Warranties')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('warranties')
export class WarrantiesController {
  constructor(
    private readonly warrantiesService: WarrantiesService,
    private readonly cartaGarantiaPdf: CartaGarantiaPdfService,
    private readonly evidencia: WarrantyEvidenceService,
    private readonly correo: DocumentoCorreoService,
  ) {}

  /** Evidencia (fotos/videos) de la garantía, para revisar antes de decidir. */
  @Get(':id/evidence')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  listEvidence(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.evidencia.listar(user, id);
  }

  /** Sube una foto o video de evidencia (mientras la garantía sigue en trámite). */
  @Post(':id/evidence')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  uploadEvidence(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; originalname?: string },
    @Body() body: { caption?: string },
  ) {
    return this.evidencia.subir(user, id, file, body?.caption);
  }

  /** Quita una evidencia (mientras la garantía sigue en trámite). */
  @Delete(':id/evidence/:evidenceId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  deleteEvidence(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
  ) {
    return this.evidencia.eliminar(user, evidenceId);
  }

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterWarrantiesDto,
  ) {
    return this.warrantiesService.findAll(user, filters);
  }

  /**
   * La carta de garantía en papel: el certificado que se entrega al cliente.
   * Va `inline` para revisarla antes de imprimirla o hacer que la firme.
   */
  @Get(':id/pdf')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  async pdf(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.cartaGarantiaPdf.generar(
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

  /** Envía la carta de garantía por correo al cliente con el PDF adjunto. */
  @Post(':id/email')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  async enviarCorreo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email?: string; mensaje?: string },
  ) {
    const doc = await this.cartaGarantiaPdf.generar(user.tenantId, id);
    return this.correo.enviar({
      to: body.email || doc.clientEmail || '',
      negocio: doc.negocio,
      tipo: 'Carta de garantía',
      folio: doc.folio,
      filename: doc.filename,
      buffer: doc.buffer,
      mensaje: body.mensaje,
    });
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warrantiesService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateWarrantyDto) {
    return this.warrantiesService.create(user, dto);
  }

  @Post(':id/authorize')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  authorize(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AuthorizeWarrantyDto,
  ) {
    return this.warrantiesService.authorize(user, id, dto);
  }

  @Post(':id/resolve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  resolve(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveWarrantyDto,
  ) {
    return this.warrantiesService.resolve(user, id, dto);
  }

  @Post(':id/reject')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  reject(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWarrantyDto,
  ) {
    return this.warrantiesService.reject(user, id, dto.reason);
  }
}
