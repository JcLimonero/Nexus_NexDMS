import {
  Controller,
  Get,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VehicleCategoriesService } from './vehicle-categories.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Vehicle Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('vehicle-categories')
export class VehicleCategoriesController {
  constructor(private readonly service: VehicleCategoriesService) {}

  @Get()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'MECHANIC',
    'SELLER',
  )
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error
          ? err.message
          : 'Error al cargar categorías de vehículo',
      );
    }
  }
}
