import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { UnitReturnsService } from './unit-returns.service';
import { CreateUnitReturnDto } from './dto/create-unit-return.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Returns')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-returns')
export class UnitReturnsController {
  constructor(private readonly unitReturnsService: UnitReturnsService) {}

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateUnitReturnDto) {
    return this.unitReturnsService.create(user, dto);
  }

  @Get('by-unit/:catalogUnitId')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'SELLER',
    'CASHIER',
    'EXECUTIVE',
  )
  findAllByCatalogUnit(
    @CurrentUser() user: UserPayload,
    @Param('catalogUnitId', ParseUUIDPipe) catalogUnitId: string,
  ) {
    return this.unitReturnsService.findAllByCatalogUnit(user, catalogUnitId);
  }
}
