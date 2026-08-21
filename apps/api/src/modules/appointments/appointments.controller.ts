import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto';
import { FilterAppointmentsDto } from './dto/filter-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('public')
  @Throttle({ short: { limit: 2, ttl: 60000 } })
  createPublic(@Body() dto: CreatePublicAppointmentDto) {
    return this.appointmentsService.createPublic(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterAppointmentsDto,
  ) {
    return this.appointmentsService.findAll(user, filters);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('calendar')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  findCalendar(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.appointmentsService.findCalendar(
      user,
      branchId,
      dateFrom,
      dateTo,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  /**
   * Las citas del día para la pantalla de recepción.
   *
   * Endpoint propio y no el calendario general porque lleva su propia
   * restricción: la agenda del día la mira el asesor de servicio, y el
   * técnico tiene la suya en el tablero del taller. Colgar la regla del
   * calendario general habría limitado también a quien lo usa para otra
   * cosa.
   */
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('monitor')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  monitor(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.tableroDelDia(user, branchId, date);
  }

  @Get('availability')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  getAvailability(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('mechanicId') mechanicId?: string,
    @Query('durationMin') durationMin?: number,
    @Query('serviceTypeId') serviceTypeId?: string,
  ) {
    return this.appointmentsService.getAvailability(
      branchId,
      date,
      mechanicId,
      durationMin ? Number(durationMin) : undefined,
      serviceTypeId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  /**
   * Asesores de la sucursal con su carga del día.
   *
   * Alimenta el combo de asignación al agendar y deja ver el reparto: quien
   * agenda puede respetar el balanceo o forzar un asesor concreto sabiendo
   * cómo va cada uno.
   */
  @Get('advisors')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  advisors(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    // Sin fecha se entiende hoy: es el caso normal al recibir en el mostrador.
    const fecha = date ? new Date(`${date}T12:00:00`) : new Date();
    return this.appointmentsService.cargaDeAsesores(
      user.tenantId,
      branchId,
      fecha,
    );
  }

  @Get(':id')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.findOne(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/confirm')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  confirm(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.confirm(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(user, id, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/complete')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'RECEPTIONIST',
  )
  complete(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.complete(user, id);
  }
}
