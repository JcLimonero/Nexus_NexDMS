import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SaleSurveysService } from './sale-surveys.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Sale Surveys')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sale-surveys')
export class SaleSurveysController {
  constructor(private readonly service: SaleSurveysService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  findAll(@CurrentUser() user: UserPayload) {
    return this.service.findAll(user);
  }

  @Get('resumen')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  resumen(@CurrentUser() user: UserPayload) {
    return this.service.resumen(user);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: { referenceLabel?: string; clientName?: string; branchId?: string },
  ) {
    return this.service.create(user, dto);
  }
}

/** Endpoints públicos (sin auth) para responder la encuesta por token. */
@ApiTags('Public Portal')
@Controller('public/sale-surveys')
export class PublicSaleSurveysController {
  constructor(private readonly service: SaleSurveysService) {}

  @Get(':token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  get(@Param('token', ParseUUIDPipe) token: string) {
    return this.service.getPublic(token);
  }

  @Post(':token')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  answer(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() body: { answers: Record<string, number | string> },
  ) {
    return this.service.answerPublic(token, body?.answers ?? {});
  }
}
