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
import { BranchRampsService } from './branch-ramps.service';
import { CreateBranchRampDto } from './dto/create-branch-ramp.dto';
import { UpdateBranchRampDto } from './dto/update-branch-ramp.dto';
import { BranchesService } from '../branches/branches.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Branch Ramps')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('branches/:branchId/ramps')
export class BranchRampsController {
  constructor(
    private readonly branchRampsService: BranchRampsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async findAll(
    @CurrentUser() user: UserPayload,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    await this.branchesService.assertBranchInScope(user, branchId);
    return this.branchRampsService.findAllByBranch(branchId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC')
  async findOne(
    @CurrentUser() user: UserPayload,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.branchesService.assertBranchInScope(user, branchId);
    return this.branchRampsService.findOne(id, branchId);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async create(
    @CurrentUser() user: UserPayload,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: CreateBranchRampDto,
  ) {
    await this.branchesService.assertBranchInScope(user, branchId);
    return this.branchRampsService.create(branchId, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async update(
    @CurrentUser() user: UserPayload,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchRampDto,
  ) {
    await this.branchesService.assertBranchInScope(user, branchId);
    return this.branchRampsService.update(id, branchId, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.branchesService.assertBranchInScope(user, branchId);
    await this.branchRampsService.remove(id, branchId);
  }
}
