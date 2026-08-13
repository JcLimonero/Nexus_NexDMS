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
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { AdditionalWorkService } from './additional-work.service';
import type { LineaTrabajoAdicional } from './additional-work.service';

@ApiTags('Trabajos adicionales')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('additional-work')
@RequiresModule('workshop')
export class AdditionalWorkController {
  constructor(private readonly additionalWork: AdditionalWorkService) {}

  /** Hallazgos de la orden con su evidencia y estado de autorización. */
  @Get('order/:serviceOrderId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  listar(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
  ) {
    return this.additionalWork.listar(user, id);
  }

  /** Cotiza los hallazgos elegidos y manda el enlace al cliente. */
  @Post('order/:serviceOrderId/quote')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  cotizar(
    @CurrentUser() user: UserPayload,
    @Param('serviceOrderId', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      findingIds: string[];
      lines: LineaTrabajoAdicional[];
      conditions?: string;
    },
  ) {
    return this.additionalWork.cotizar(user, id, dto);
  }
}
