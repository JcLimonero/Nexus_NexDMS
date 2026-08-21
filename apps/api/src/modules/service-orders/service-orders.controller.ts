import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ServiceOrdersService } from './service-orders.service';
import { OrdenPdfService } from './orden-pdf.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FilterServiceOrdersDto } from './dto/filter-service-orders.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { UpdatePromisedDateDto } from './dto/update-promised-date.dto';
import { RequestPartDto } from './dto/request-part.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AddPartDto } from './dto/add-part.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UploadReceptionPhotoDto } from './dto/upload-reception-photo.dto';
import { UpdatePartNotesDto } from './dto/update-part-notes.dto';
import { CreateUpdateDto } from './dto/create-update.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { SaveSafetyChecklistDto } from '../mechanic-checklist/dto/save-safety-checklist.dto';
import { AssignMechanicDto } from './dto/assign-mechanic.dto';
import { MechanicChecklistService } from '../mechanic-checklist/mechanic-checklist.service';
import { DeliverServiceOrderDto } from './dto/deliver-service-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Service Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly ordenPdf: OrdenPdfService,
    private readonly mechanicChecklistService: MechanicChecklistService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC', 'AUDITOR')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterServiceOrdersDto,
  ) {
    return this.serviceOrdersService.findAll(user, filters);
  }

  /** Resultados de las encuestas de servicio (general y por pregunta). */
  @Get('surveys/resumen')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'AUDITOR')
  resumenEncuestas(@CurrentUser() user: UserPayload) {
    return this.serviceOrdersService.resumenEncuestas(user);
  }

  /** Encuestas de servicio respondidas (lista con cliente/vehículo). */
  @Get('surveys/list')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'AUDITOR')
  listaEncuestas(@CurrentUser() user: UserPayload) {
    return this.serviceOrdersService.listaEncuestas(user);
  }

  /** Ficha de una encuesta respondida. */
  @Get('surveys/:surveyId/ficha')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'AUDITOR')
  fichaEncuesta(
    @CurrentUser() user: UserPayload,
    @Param('surveyId', ParseUUIDPipe) surveyId: string,
  ) {
    return this.serviceOrdersService.fichaEncuesta(user, surveyId);
  }

  /**
   * La orden en papel: es lo que el cliente firma al dejar la unidad y con lo
   * que se discute a la entrega. Va como PDF y no como pantalla imprimible
   * porque tiene que salir igual desde el DMS, desde la tableta y desde un
   * correo, y porque quien lo firma no debería poder cambiarlo antes.
   */
  @Get(':id/pdf')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  async pdf(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.ordenPdf.generar(user.tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      // `inline` y no `attachment`: casi siempre se quiere revisar en pantalla
      // antes de mandarlo a la impresora del mostrador.
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC', 'AUDITOR')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user, id, dto);
  }

  @Patch(':id/promised-date')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  updatePromisedDate(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromisedDateDto,
  ) {
    return this.serviceOrdersService.updatePromisedDate(user, id, dto);
  }

  @Get(':id/promise-history')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  promiseHistory(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.historialFechaPromesa(user, id);
  }

  @Post(':id/request-part')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  requestPart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestPartDto,
  ) {
    return this.serviceOrdersService.requestPart(user, id, dto);
  }

  @Post(':id/change-status')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  changeStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.serviceOrdersService.changeStatus(user, id, dto);
  }

  @Post(':id/assign-mechanic')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  assignMechanic(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignMechanicDto,
  ) {
    return this.serviceOrdersService.assignMechanic(user, id, dto.mechanicId);
  }

  @Post(':id/parts')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  addPart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartDto,
  ) {
    return this.serviceOrdersService.addPart(user, id, dto);
  }

  @Delete(':id/parts/:osPartId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  removePart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('osPartId', ParseUUIDPipe) osPartId: string,
  ) {
    return this.serviceOrdersService.removePart(user, id, osPartId);
  }

  @Post(':id/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  createChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.serviceOrdersService.createChecklist(user, id, dto);
  }

  @Get(':id/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const so = await this.serviceOrdersService.findOne(user, id);
    if (!so.checklist) {
      throw new NotFoundException('No existe checklist para esta OS');
    }
    return so.checklist;
  }

  @Post(':id/checklist/photos')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceptionPhoto(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadReceptionPhotoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Archivo requerido');
    }
    return this.serviceOrdersService.uploadReceptionPhoto(
      user,
      id,
      dto.angle,
      file,
    );
  }

  @Patch(':id/parts/:partId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  updatePartNotes(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Body() dto: UpdatePartNotesDto,
  ) {
    return this.serviceOrdersService.updatePartNotes(user, id, partId, dto);
  }

  @Post(':id/updates')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  addUpdate(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUpdateDto,
  ) {
    return this.serviceOrdersService.addUpdate(user, id, dto);
  }

  @Get(':id/updates')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getUpdates(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.getUpdates(user, id);
  }

  @Post(':id/findings')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  @UseInterceptors(FileInterceptor('file'))
  createFinding(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFindingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Archivo requerido para el hallazgo');
    }
    return this.serviceOrdersService.createFinding(user, id, dto, file);
  }

  @Get(':id/findings')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getFindings(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.getFindings(user, id);
  }

  @Post(':id/safety-checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  saveSafetyChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveSafetyChecklistDto,
  ) {
    return this.mechanicChecklistService.saveSafetyChecklist(user, id, dto);
  }

  @Get(':id/safety-checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getSafetyChecklist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mechanicChecklistService.getSafetyChecklist(user, id);
  }

  @Post(':id/time/start')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  startTime(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.startTime(user, id);
  }

  @Post(':id/time/pause')
  @Roles('SUPERADMIN', 'ADMIN', 'MECHANIC')
  pauseTime(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.pauseTime(user, id);
  }

  @Get(':id/time')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getTimeSummary(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.getTimeSummary(user, id);
  }

  @Post(':id/deliver')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  deliver(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverServiceOrderDto,
  ) {
    return this.serviceOrdersService.deliver(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceOrdersService.cancel(user, id);
  }
}
