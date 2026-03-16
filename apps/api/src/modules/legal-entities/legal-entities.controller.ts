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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegalEntitiesService } from './legal-entities.service';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { FilterLegalEntitiesDto } from './dto/filter-legal-entities.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Legal Entities')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('legal-entities')
export class LegalEntitiesController {
  constructor(private readonly legalEntitiesService: LegalEntitiesService) {}

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterLegalEntitiesDto,
  ) {
    return this.legalEntitiesService.findAll(user, filters);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.legalEntitiesService.findOne(user, id);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateLegalEntityDto) {
    return this.legalEntitiesService.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalEntityDto,
  ) {
    return this.legalEntitiesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deactivate(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.legalEntitiesService.deactivate(user, id);
  }
}
