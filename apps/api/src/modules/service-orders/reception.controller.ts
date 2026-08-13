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
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import {
  ReceptionService,
  ReceptionServiceLine,
} from './reception.service';
import {
  ReceptionMarkTypeEnum,
  ReceptionPhotoSpec,
} from './entities/reception-catalog.entities';

@ApiTags('Recepción')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('reception')
@RequiresModule('workshop')
export class ReceptionController {
  constructor(private readonly reception: ReceptionService) {}

  /** Citas del día con su estado de recepción. */
  @Get('agenda')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  agenda(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.reception.agendaDelDia(user, branchId, date);
  }

  /** Catálogo de fotos aplicable (opcionalmente por tipo de vehículo). */
  @Get('photo-specs')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  specs(
    @CurrentUser() user: UserPayload,
    @Query('vehicleType') vehicleType?: string,
  ) {
    return this.reception.specsForVehicleType(user.tenantId, vehicleType);
  }

  @Put('photo-specs')
  @Roles('SUPERADMIN', 'ADMIN')
  saveSpec(
    @CurrentUser() user: UserPayload,
    @Body() dto: Partial<ReceptionPhotoSpec>,
  ) {
    return this.reception.saveSpec(user.tenantId, dto);
  }

  @Delete('photo-specs/:id')
  @Roles('SUPERADMIN', 'ADMIN')
  removeSpec(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reception.removeSpec(user.tenantId, id);
  }

  /** Servicios predefinidos para cotizar. */
  @Get('service-types')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  serviceTypes(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.reception.serviciosPredefinidos(user.tenantId, branchId);
  }

  /** Abre la recepción de una cita creando su orden de servicio. */
  @Post('from-appointment/:appointmentId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  recibirCita(
    @CurrentUser() user: UserPayload,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.reception.recibirCita(user, appointmentId);
  }

  /** Estado completo de la recepción de una orden. */
  @Get(':serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  get(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.reception.getReception(user, id);
  }

  @Post(':serviceOrderId/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  saveChecklist(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      kmIn: number;
      fuelLevel: number;
      hasSpareTire?: boolean;
      hasTools?: boolean;
      hasDocuments?: boolean;
      hasMats?: boolean;
      observations?: string;
      damageDescription?: string;
    },
  ) {
    return this.reception.saveChecklist(user, id, dto);
  }

  @Post(':serviceOrderId/media/:specCode')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Param('specCode') specCode: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reception.uploadMedia(user, id, specCode, file);
  }

  @Post('photos/:photoId/marks')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  addMark(
    @CurrentUser() user: UserPayload,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body()
    dto: { type: ReceptionMarkTypeEnum; note?: string; x: number; y: number },
  ) {
    return this.reception.addMark(user, photoId, dto);
  }

  @Delete('marks/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  removeMark(@Param('id', ParseUUIDPipe) id: string) {
    return this.reception.removeMark(id);
  }

  /** Genera la cotización de la recepción y avisa al cliente. */
  @Post(':serviceOrderId/quote')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  quote(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { lines: ReceptionServiceLine[]; conditions?: string },
  ) {
    return this.reception.cotizarServicios(user, id, dto);
  }
}
