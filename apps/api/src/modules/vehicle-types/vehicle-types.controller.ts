import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { VehicleTypesService } from './vehicle-types.service';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Vehicle Types')
@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly service: VehicleTypesService) {}

  @Get()
  async findAll(@Query('categoryId') categoryId?: string) {
    try {
      if (categoryId) {
        return await this.service.findByCategoryId(categoryId);
      }
      return await this.service.findAll();
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error
          ? err.message
          : 'Error al cargar tipos de vehículo',
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'MECHANIC',
    'SELLER',
  )
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateVehicleTypeDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleTypeDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN')
  remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user, id);
  }
}
