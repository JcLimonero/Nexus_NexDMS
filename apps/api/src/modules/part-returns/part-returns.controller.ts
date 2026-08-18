import {
  Body,
  Controller,
  Get,
  Param,
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
import { PartReturnsService } from './part-returns.service';
import { CreatePartReturnDto } from './dto/create-part-return.dto';
import { ReturnKindEnum } from './entities/part-return.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Part Returns')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('part-returns')
export class PartReturnsController {
  constructor(private readonly service: PartReturnsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query('kind') kind?: ReturnKindEnum,
  ) {
    return this.service.findAll(user, kind);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreatePartReturnDto,
  ) {
    return this.service.create(user, dto);
  }

  /** Emite la nota de crédito (CFDI) de una devolución de cliente. */
  @Post(':id/nota-credito')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  emitirNotaCredito(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.emitirNotaCredito(user, id);
  }
}
