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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserAvailabilityService } from './user-availability.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserAbsenceTypeEnum } from './entities/user-absence.entity';

@ApiTags('User Availability')
@Controller('user-availability')
export class UserAvailabilityController {
  constructor(
    private readonly userAvailabilityService: UserAvailabilityService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('slots')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getAvailableSlots(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('mechanicId') mechanicId?: string,
    @Query('durationMin') durationMin?: number,
    @Query('serviceTypeId') serviceTypeId?: string,
  ) {
    return this.userAvailabilityService.getAvailableSlots(
      branchId,
      date,
      mechanicId,
      durationMin ? Number(durationMin) : undefined,
      serviceTypeId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('mechanics')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getMechanicsForBranch(@Query('branchId') branchId: string) {
    return this.userAvailabilityService.getMechanicsForBranch(branchId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('mechanics-with-details')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async getMechanicsWithDetailsForBranch(@Query('branchId') branchId: string) {
    return this.userAvailabilityService.getMechanicsWithDetailsForBranch(
      branchId,
    );
  }
  /**
   * Horario semanal y ausencias de una persona.
   *
   * Quien reparte trabajo también lo consulta, no solo quien administra: saber
   * hasta qué hora está un técnico es parte de decidir a quién darle la orden.
   */
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('agenda/:userId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  agenda(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.userAvailabilityService.agendaDe(userId, branchId);
  }

  /** Quién está y quién no en la sucursal ese día. */
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Get('panel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST')
  panel(@Query('branchId') branchId: string, @Query('date') date: string) {
    return this.userAvailabilityService.panelDelDia(branchId, date);
  }

  /** Reemplaza la semana completa; lo que no venga, deja de estar. */
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Put('agenda/:userId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  guardarHorario(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body()
    dto: {
      branchId: string;
      dias: { dayOfWeek: number; startTime: string; endTime: string }[];
    },
  ) {
    return this.userAvailabilityService.guardarHorario(
      userId,
      dto.branchId,
      dto.dias ?? [],
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Post('agenda/:userId/ausencias')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  registrarAusencia(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body()
    dto: {
      branchId: string;
      startDate: string;
      endDate: string;
      type: UserAbsenceTypeEnum;
      notes?: string;
    },
  ) {
    return this.userAvailabilityService.registrarAusencia(
      userId,
      dto.branchId,
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Delete('ausencias/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  eliminarAusencia(@Param('id', ParseUUIDPipe) id: string) {
    return this.userAvailabilityService.eliminarAusencia(id);
  }

}
