import {
  Body,
  Controller,
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
import { GlobalModelsService } from './global-models.service';
import { CreateGlobalModelDto } from './dto/create-global-model.dto';
import { UpdateGlobalModelDto } from './dto/update-global-model.dto';
import { FilterGlobalModelsDto } from './dto/filter-global-models.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Global Models')
@Controller('global-models')
export class GlobalModelsController {
  constructor(private readonly globalModelsService: GlobalModelsService) {}

  @Get()
  async findAll(@Query() filters: FilterGlobalModelsDto) {
    try {
      return await this.globalModelsService.findAll(null as never, filters);
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar modelos globales',
      );
    }
  }

  @Get('brands')
  async getBrands(@Query('vehicleTypeCode') vehicleTypeCode: string) {
    try {
      return await this.globalModelsService.getBrands(
        vehicleTypeCode || 'CAR',
      );
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar marcas',
      );
    }
  }

  @Get('models')
  async getModels(
    @Query('vehicleTypeCode') vehicleTypeCode: string,
    @Query('brandName') brandName: string,
  ) {
    try {
      return await this.globalModelsService.getModels(
        vehicleTypeCode || 'CAR',
        brandName || '',
      );
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Error al listar modelos',
      );
    }
  }

  @Get('similar')
  findSimilarSuggestions(
    @Query('brandId') brandId: string,
    @Query('model') model: string,
    @Query('version') version?: string,
  ) {
    return this.globalModelsService.findSimilarSuggestions(
      brandId || '',
      model || '',
      version,
    );
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
    return this.globalModelsService.findOne(user, id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateGlobalModelDto) {
    return this.globalModelsService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGlobalModelDto,
  ) {
    return this.globalModelsService.update(user, id, dto);
  }
}
