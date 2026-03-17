import {
  Controller,
  Get,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CombustionTypesService } from './combustion-types.service';

@ApiTags('Combustion Types')
@Controller('combustion-types')
export class CombustionTypesController {
  constructor(private readonly service: CombustionTypesService) {}

  @Get()
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al cargar tipos de combustión',
      );
    }
  }
}
