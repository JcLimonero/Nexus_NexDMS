import {
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
import { UnitAccessoriesService } from './unit-accessories.service';
import { CreateUnitAccessoryDto } from './dto/create-unit-accessory.dto';
import { UpdateUnitAccessoryDto } from './dto/update-unit-accessory.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Accessories')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-accessories')
export class UnitAccessoriesController {
  constructor(
    private readonly unitAccessoriesService: UnitAccessoriesService,
  ) {}

  @Get('compatible')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  getCompatible(
    @CurrentUser() user: UserPayload,
    @Query('catalogUnitId') catalogUnitId: string,
  ) {
    return this.unitAccessoriesService.getCompatibleAccessories(
      user,
      catalogUnitId,
    );
  }

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  findAll(@CurrentUser() user: UserPayload) {
    return this.unitAccessoriesService.findAll(user);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitAccessoriesService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateUnitAccessoryDto,
  ) {
    return this.unitAccessoriesService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitAccessoryDto,
  ) {
    return this.unitAccessoriesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  delete(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitAccessoriesService.delete(user, id);
  }
}
