import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { SaleDocumentsService } from './sale-documents.service';
import {
  SaleDocumentRule,
  SaleDocumentStatusEnum,
  SaleDocumentType,
} from './entities/sale-document.entities';

@ApiTags('Documentos de venta')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
// Se protege por rol, igual que el propio módulo de ventas de unidades: quien
// puede vender puede juntar el expediente.
@Controller('sale-documents')
export class SaleDocumentsController {
  constructor(private readonly service: SaleDocumentsService) {}

  // ── Catálogo y matriz: configuración, solo administración ──

  @Get('types')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  tipos(@CurrentUser() user: UserPayload) {
    return this.service.tipos(user.tenantId);
  }

  @Put('types')
  @Roles('SUPERADMIN', 'ADMIN')
  guardarTipo(
    @CurrentUser() user: UserPayload,
    @Body() dto: Partial<SaleDocumentType>,
  ) {
    return this.service.guardarTipo(user.tenantId, dto);
  }

  @Delete('types/:id')
  @Roles('SUPERADMIN', 'ADMIN')
  eliminarTipo(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.eliminarTipo(user.tenantId, id);
  }

  @Get('rules')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  reglas(@CurrentUser() user: UserPayload) {
    return this.service.reglas(user.tenantId);
  }

  @Put('rules')
  @Roles('SUPERADMIN', 'ADMIN')
  guardarRegla(
    @CurrentUser() user: UserPayload,
    @Body() dto: Partial<SaleDocumentRule>,
  ) {
    return this.service.guardarRegla(user.tenantId, dto);
  }

  @Delete('rules/:id')
  @Roles('SUPERADMIN', 'ADMIN')
  eliminarRegla(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.eliminarRegla(user.tenantId, id);
  }

  // ── Expediente de una venta ──

  @Get('sale/:unitSaleId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  expediente(
    @CurrentUser() user: UserPayload,
    @Param('unitSaleId', ParseUUIDPipe) unitSaleId: string,
  ) {
    return this.service.expediente(user, unitSaleId);
  }

  @Post('sale/:unitSaleId/upload')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  @UseInterceptors(FileInterceptor('file'))
  subir(
    @CurrentUser() user: UserPayload,
    @Param('unitSaleId', ParseUUIDPipe) unitSaleId: string,
    @Query('documentTypeId', ParseUUIDPipe) documentTypeId: string,
    @Query('expirationDate') expirationDate: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.subir(
      user,
      unitSaleId,
      documentTypeId,
      file,
      expirationDate,
    );
  }

  @Get('document/:id/download-url')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  descarga(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.ligaDescarga(user, id);
  }

  @Post('document/:id/review')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  revisar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: SaleDocumentStatusEnum; rejectionReason?: string },
  ) {
    return this.service.revisar(user, id, dto);
  }

  @Delete('document/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  eliminarDocumento(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.eliminarDocumento(user, id);
  }
}
