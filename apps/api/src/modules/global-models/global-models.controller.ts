import {
  Body,
  Controller,
  Get,
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
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('global-models')
export class GlobalModelsController {
  constructor(private readonly globalModelsService: GlobalModelsService) {}

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
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterGlobalModelsDto,
  ) {
    return this.globalModelsService.findAll(user, filters);
  }

  @Get(':id')
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
  @Roles('SUPERADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateGlobalModelDto) {
    return this.globalModelsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGlobalModelDto,
  ) {
    return this.globalModelsService.update(user, id, dto);
  }
}
