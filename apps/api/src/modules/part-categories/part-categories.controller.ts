import {
  Body,
  Controller,
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
import { PartCategoriesService } from './part-categories.service';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { UpdatePartCategoryDto } from './dto/update-part-category.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Part Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('part-categories')
export class PartCategoriesController {
  constructor(private readonly partCategoriesService: PartCategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.partCategoriesService.findAll(user);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'CASHIER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreatePartCategoryDto) {
    return this.partCategoriesService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE', 'MANAGER', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartCategoryDto,
  ) {
    return this.partCategoriesService.update(user, id, dto);
  }
}
