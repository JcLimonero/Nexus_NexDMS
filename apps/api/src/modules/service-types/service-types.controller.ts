import {
  BadRequestException,
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
import { ServiceTypesService } from './service-types.service';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { AddPartToServiceTypeDto } from './dto/add-part-to-service-type.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Service Types')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.serviceTypesService.findAll(user.tenantId, branchId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceTypesService.findOne(id, user.tenantId);
  }

  @Get(':id/parts-availability')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  getPartsAvailability(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('branchId') branchId: string,
  ) {
    if (!branchId) {
      throw new BadRequestException('branchId es requerido');
    }
    return this.serviceTypesService.checkPartsAvailability(
      id,
      branchId,
      user.tenantId,
    );
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateServiceTypeDto) {
    return this.serviceTypesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.serviceTypesService.update(id, user.tenantId, dto);
  }

  @Post(':id/parts')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  addPart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartToServiceTypeDto,
  ) {
    return this.serviceTypesService.addPart(id, user.tenantId, dto);
  }

  @Delete(':id/parts/:partId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  removePart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ) {
    return this.serviceTypesService.removePart(id, partId, user.tenantId);
  }
}
