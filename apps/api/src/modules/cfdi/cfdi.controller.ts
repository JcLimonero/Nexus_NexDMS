import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CfdiService } from './cfdi.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { FilterCfdiDto } from './dto/filter-cfdi.dto';
import { CancelCfdiDto } from './dto/cancel-cfdi.dto';
import { RegisterPagoDto } from './dto/register-pago.dto';
import { NotaCreditoDto } from './dto/nota-credito.dto';
import { FacturaGlobalDto } from './dto/factura-global.dto';

@ApiTags('CFDI')
@Controller('cfdi')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CfdiController {
  constructor(private readonly cfdiService: CfdiService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query() filters: FilterCfdiDto) {
    return this.cfdiService.findAll(user, filters);
  }

  @Get(':id')
  findOne(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.cfdiService.findOne(user, id);
  }

  @Post('pago/:id')
  registerPago(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: RegisterPagoDto,
  ) {
    return this.cfdiService.registerPago(user, id, dto);
  }

  @Post('generar/:referenceType/:referenceId')
  generarIngreso(
    @CurrentUser() user: UserPayload,
    @Param('referenceType') referenceType: 'Sale' | 'ServiceOrder' | 'UnitSale',
    @Param('referenceId') referenceId: string,
  ) {
    return this.cfdiService.generarIngreso(referenceType, referenceId);
  }

  @Post('global')
  generarGlobal(
    @CurrentUser() user: UserPayload,
    @Body() dto: FacturaGlobalDto,
  ) {
    return this.cfdiService.generarGlobal(user, dto);
  }

  @Post(':id/nota-credito')
  notaCredito(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: NotaCreditoDto,
  ) {
    return this.cfdiService.generarNotaCredito(user, id, dto);
  }

  @Post(':id/cancelar')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: CancelCfdiDto,
  ) {
    return this.cfdiService.cancel(user, id, dto);
  }

  @Post(':id/reenviar')
  resend(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.cfdiService.resend(user, id);
  }
}
