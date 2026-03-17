import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehicleTypesService } from './vehicle-types.service';

@ApiTags('Vehicle Types')
@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly service: VehicleTypesService) {}

  @Get()
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al cargar tipos de vehículo',
      );
    }
  }
}
