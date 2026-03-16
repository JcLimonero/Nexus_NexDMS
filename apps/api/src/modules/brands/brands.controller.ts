import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.brandsService.findAll(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.brandsService.findOne(user, id);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateBrandDto) {
    return this.brandsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deactivate(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.brandsService.deactivate(user, id);
  }
}
