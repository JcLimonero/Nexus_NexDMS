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
  ReceptionMarkShapeEnum,
  ReceptionMarkTypeEnum,
  ReceptionPhotoSpec,
} from './entities/reception-catalog.entities';

@ApiTags('Recepción')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('reception')
// Módulo propio: quien recibe unidades no necesita el resto del taller, y hay
// talleres que contratan solo esta parte.
@RequiresModule('reception')
export class ReceptionController {
  constructor(private readonly reception: ReceptionService) {}

  /** Citas del día con su estado de recepción. */
  @Get('agenda')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  agenda(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('soloMias') soloMias?: string,
  ) {
    return this.reception.agendaDelDia(user, branchId, date, soloMias === 'true');
  }

  /** Catálogo de fotos aplicable (opcionalmente por tipo de vehículo). */
  @Get('photo-specs')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
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
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  serviceTypes(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.reception.serviciosPredefinidos(user.tenantId, branchId);
  }

  /** Abre la recepción de una cita creando su orden de servicio. */
  @Post('from-appointment/:appointmentId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  recibirCita(
    @CurrentUser() user: UserPayload,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body()
    datos?: {
      clientId?: string;
      vehicleId?: string;
      vehiculo?: {
        vehicleType: string;
        make: string;
        model: string;
        year: number;
        plate?: string;
        vin?: string;
        mileage?: number;
        color?: string;
      };
    },
  ) {
    return this.reception.recibirCita(user, appointmentId, datos);
  }

  /** Recepción sin cita (walk-in): abre la orden con cliente y unidad al vuelo. */
  @Post('walk-in')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  recibirSinCita(
    @CurrentUser() user: UserPayload,
    @Body()
    dto: {
      branchId: string;
      clientId?: string;
      cliente?: { firstName: string; lastName?: string; phone: string };
      vehicleId?: string;
      vehiculo?: {
        vehicleType: string;
        make: string;
        model: string;
        year?: number;
        plate?: string;
        vin?: string;
        mileage?: number;
        color?: string;
      };
      reportedFault?: string;
      serviceTypeId?: string;
      kmIn?: number;
    },
  ) {
    return this.reception.recibirSinCita(user, dto);
  }

  // ─── Consulta de la evidencia ────────────────────
  //
  // Van antes de `:serviceOrderId` porque Nest resuelve las rutas por orden
  // de declaración: debajo, `evidencia` se tomaría por el id de una orden y
  // reventaría en el ParseUUIDPipe.
  //
  // El mecánico entra aquí y no al resto de la recepción: necesita ver cómo
  // llegó la unidad antes de tocarla —para que no le achaquen un golpe que
  // ya venía— pero no captura ni cotiza.

  /** Fotos y marcas de una recepción, en solo lectura. */
  @Get('evidencia/orden/:serviceOrderId')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  evidenciaOrden(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.reception.evidenciaDeOrden(user.tenantId, id);
  }

  /** Cómo llegó esta unidad en cada visita, de la más reciente a la más vieja. */
  @Get('evidencia/vehiculo/:vehicleId')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  evidenciaVehiculo(
    @CurrentUser() user: UserPayload,
    @Param('vehicleId', ParseUUIDPipe) id: string,
  ) {
    return this.reception.evidenciaDeVehiculo(user.tenantId, id);
  }

  /** Evidencia de todas las unidades de un cliente, agrupada por unidad. */
  @Get('evidencia/cliente/:clientId')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'RECEPTIONIST',
    'MECHANIC',
  )
  evidenciaCliente(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) id: string,
  ) {
    return this.reception.evidenciaDeCliente(user.tenantId, id);
  }

  /** Estado completo de la recepción de una orden. */
  @Get(':serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  get(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.reception.getReception(user, id);
  }

  @Post(':serviceOrderId/checklist')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
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
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
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
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  addMark(
    @CurrentUser() user: UserPayload,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body()
    dto: {
      type: ReceptionMarkTypeEnum;
      /** Sin forma, punto: es lo que se guardaba antes del círculo. */
      shape?: ReceptionMarkShapeEnum;
      note?: string;
      x: number;
      y: number;
      radius?: number;
    },
  ) {
    return this.reception.addMark(user, photoId, dto);
  }

  @Delete('marks/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  removeMark(@Param('id', ParseUUIDPipe) id: string) {
    return this.reception.removeMark(id);
  }

  /** Genera la cotización de la recepción y avisa al cliente. */
  @Post(':serviceOrderId/quote')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  quote(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body() dto: { lines: ReceptionServiceLine[]; conditions?: string },
  ) {
    return this.reception.cotizarServicios(user, id, dto);
  }
}
