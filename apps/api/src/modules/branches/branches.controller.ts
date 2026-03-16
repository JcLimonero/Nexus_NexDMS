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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBranchConfigDto } from './dto/update-branch-config.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.branchesService.findAll(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.findOne(user, id);
  }

  @Post()
  @Roles('ADMIN')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(user, id, dto);
  }

  @Get(':id/config')
  @Roles('ADMIN')
  getConfig(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.getConfig(user, id);
  }

  @Patch(':id/config')
  @Roles('ADMIN')
  updateConfig(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchConfigDto,
  ) {
    return this.branchesService.updateConfig(user, id, dto);
  }
}
