import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { UnitReservationsService } from './unit-reservations.service';
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
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterUnitReservationsDto,
  ) {
    return this.unitReservationsService.findAll(user, filters);
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
