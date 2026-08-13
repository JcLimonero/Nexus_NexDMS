import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';
import { ServiceKitsService } from './service-kits.service';
import { CreateServiceKitDto } from './dto/create-service-kit.dto';

@ApiTags('Kits de servicio')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('service-kits')
@RequiresModule('workshop')
export class ServiceKitsController {
  constructor(private readonly kits: ServiceKitsService) {}

  /** Familias de kit para el combo, incluidas las de fábrica. */
  @Get('tipos')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  tipos(@CurrentUser() user: UserPayload) {
    return this.kits.tipos(user.tenantId);
  }

  /** Kits ya resueltos contra el almacén: traen precio y semáforo de stock. */
  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  buscar(
    @CurrentUser() user: UserPayload,
    @Query('q') q?: string,
    @Query('kitType') kitType?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.kits.buscar(user, { q, kitType, vehicleType, branchId });
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  obtener(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kits.obtener(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN')
  crear(@CurrentUser() user: UserPayload, @Body() dto: CreateServiceKitDto) {
    return this.kits.crear(user, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN')
  eliminar(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kits.eliminar(user, id);
  }
}
