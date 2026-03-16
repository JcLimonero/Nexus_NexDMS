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
import { BranchPrintersService } from './branch-printers.service';
import { CreateBranchPrinterDto } from './dto/create-branch-printer.dto';
import { UpdateBranchPrinterDto } from './dto/update-branch-printer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Branch Printers')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('branch-printers')
export class BranchPrintersController {
  constructor(private readonly branchPrintersService: BranchPrintersService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER', 'MECHANIC')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.branchPrintersService.findAll(user, branchId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER', 'MECHANIC')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchPrintersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateBranchPrinterDto,
  ) {
    return this.branchPrintersService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchPrinterDto,
  ) {
    return this.branchPrintersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchPrintersService.remove(user, id);
  }
}
