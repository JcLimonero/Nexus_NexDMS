import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { BillingStatusService } from './billing-status.service';
import { SaasService } from './saas.service';

/**
 * Lo que el propio cliente ve de su cobro del SaaS: su estado de adeudo y, si
 * está en mora, lo que necesita para pagar. A diferencia de `SaasController`
 * (que es de Nexus), esto lo consulta cualquier usuario autenticado del tenant.
 *
 * El interceptor de bloqueo deja pasar estas rutas aunque la cuenta esté
 * bloqueada: es justo por aquí por donde el cliente se regulariza.
 */
@ApiTags('Cobro SaaS (cliente)')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('mi-cobro')
export class MiCobroController {
  constructor(
    private readonly billing: BillingStatusService,
    private readonly saas: SaasService,
  ) {}

  /** Estado de bloqueo por pago del cliente que consulta. */
  @Get('estado')
  async estado(@CurrentUser() user: UserPayload) {
    const estado = await this.billing.estado(user.tenantId);
    const cobro = await this.saas.cobroMensual(user.tenantId);
    return { ...estado, cobroMensual: cobro.total, moneda: 'MXN' };
  }

  /** Inicia el pago en línea del adeudo y devuelve la liga de la pasarela. */
  @Post('checkout')
  checkout(@CurrentUser() user: UserPayload) {
    return this.saas.iniciarCheckout(user.tenantId);
  }
}
