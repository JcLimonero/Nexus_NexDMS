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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { UpdatePartLocationDto } from './dto/update-part-location.dto';
import { FilterPartsDto } from './dto/filter-parts.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Parts')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query() filters: FilterPartsDto) {
    return this.partsService.findAll(user, filters);
  }

  @Get('scan')
  scan(
    @CurrentUser() user: UserPayload,
    @Query('code') code: string,
    @Query('branchId') branchId: string,
  ) {
    return this.partsService.scan(user, code ?? '', branchId ?? '');
  }

  @Get('alerts')
  getAlerts(@CurrentUser() user: UserPayload) {
    return this.partsService.getLowStockAlerts(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreatePartDto) {
    return this.partsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartDto,
  ) {
    return this.partsService.update(user, id, dto);
  }

  @Patch(':id/location')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  updateLocation(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartLocationDto,
  ) {
    return this.partsService.updateLocation(user, id, dto.locationId ?? null);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.partsService.softDelete(user, id);
    return { deleted: true };
  }

  // ─── Equivalencias (números de parte alternos) ──────────────

  @Get(':id/equivalences')
  listEquivalences(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partsService.listEquivalences(user, id);
  }

  @Post(':id/equivalences')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'SELLER')
  addEquivalence(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: { equivalentSku: string; brand?: string | null; note?: string | null },
  ) {
    return this.partsService.addEquivalence(user, id, dto);
  }

  @Delete(':id/equivalences/:equivId')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'SELLER')
  async removeEquivalence(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('equivId', ParseUUIDPipe) equivId: string,
  ) {
    await this.partsService.removeEquivalence(user, id, equivId);
    return { deleted: true };
  }
}
