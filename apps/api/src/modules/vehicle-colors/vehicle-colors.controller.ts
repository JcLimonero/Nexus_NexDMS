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
import { VehicleColorsService } from './vehicle-colors.service';
import { CreateVehicleColorDto } from './dto/create-vehicle-color.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Vehicle Colors')
@Controller('vehicle-colors')
export class VehicleColorsController {
  constructor(private readonly service: VehicleColorsService) {}

  @Get('distinct-exterior-names')
  async findDistinctExteriorNames() {
    try {
      return await this.service.findDistinctExteriorNames();
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar colores',
      );
    }
  }

  @Get()
  async findByVersion(
    @Query('versionId') versionId: string,
    @Query('colorType') colorType?: 'INTERIOR' | 'EXTERIOR',
  ) {
    try {
      return await this.service.findByVersion(versionId || '', colorType);
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar colores',
      );
    }
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateVehicleColorDto) {
    return this.service.create(user, dto);
  }
}
