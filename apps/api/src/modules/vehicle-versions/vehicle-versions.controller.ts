import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VehicleVersionsService } from './vehicle-versions.service';
import { CreateVehicleVersionDto } from './dto/create-vehicle-version.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Vehicle Versions')
@Controller('vehicle-versions')
export class VehicleVersionsController {
  constructor(private readonly service: VehicleVersionsService) {}

  @Get('by-context')
  async findByContext(
    @Query('brandId') brandId: string,
    @Query('modelName') modelName: string,
    @Query('year') year: string,
    @Query('versionName') versionName: string,
  ) {
    try {
      const y = year ? parseInt(year, 10) : 0;
      return await this.service.findByContext(
        brandId || '',
        modelName || '',
        isNaN(y) ? 0 : y,
        versionName || '',
      );
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al buscar versión',
      );
    }
  }

  @Get()
  async findByBrandModelYear(
    @Query('brandId') brandId: string,
    @Query('modelId') modelId: string,
    @Query('year') year: string,
  ) {
    try {
      const y = year ? parseInt(year, 10) : new Date().getFullYear();
      return await this.service.findByBrandModelYear(
        brandId || '',
        modelId || '',
        isNaN(y) ? new Date().getFullYear() : y,
      );
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar versiones',
      );
    }
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateVehicleVersionDto,
  ) {
    return this.service.create(user, dto);
  }
}
