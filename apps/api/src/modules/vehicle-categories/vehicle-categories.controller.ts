import {
  Controller,
  Get,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehicleCategoriesService } from './vehicle-categories.service';

@ApiTags('Vehicle Categories')
@Controller('vehicle-categories')
export class VehicleCategoriesController {
  constructor(private readonly service: VehicleCategoriesService) {}

  @Get()
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
