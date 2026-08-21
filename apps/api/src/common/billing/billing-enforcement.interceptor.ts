import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, from, switchMap } from 'rxjs';
import {
  BillingBlockState,
  BillingStatusService,
} from '../../modules/saas/billing-status.service';

interface ReqUser {
  tenantId?: string;
  roles?: string[];
  admin?: boolean;
}

const METODOS_LECTURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rutas que deben responder aunque el cliente esté bloqueado por falta de pago:
 * autenticación (para entrar y llegar al portal), el estado y el checkout de
 * cobro (para poder pagar) y el webhook de la pasarela (para reactivar).
 */
const EXENTAS = ['/auth/', '/admin-auth/', '/mi-cobro/', '/saas/webhook/'];

/**
 * Bloqueo escalonado por falta de pago del SaaS.
 *
 * Se corre como interceptor —no guard— a propósito: los guards globales
 * arrancan antes de que Passport pueble `req.user`, así que no verían de qué
 * cliente se trata. El interceptor corre después, con el usuario ya resuelto.
 *
 * Escalones (los calcula {@link BillingStatusService} a partir de los cobros
 * vencidos): al corriente pasa; en solo-lectura pasan los GET y se rechaza toda
 * escritura; bloqueado se rechaza todo. Nexus (SUPERADMIN / admin de portal)
 * queda siempre exento para poder seguir administrando al cliente moroso.
 */
@Injectable()
export class BillingEnforcementInterceptor implements NestInterceptor {
  constructor(
    private readonly billing: BillingStatusService,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<{
      user?: ReqUser;
      method?: string;
      path?: string;
      url?: string;
    }>();
    const user = req.user;

    // Sin usuario (ruta pública) o personal de Nexus: nada que hacer.
    if (!user || !user.tenantId) return next.handle();
    if (user.admin || user.roles?.includes('SUPERADMIN')) return next.handle();

    const ruta = (req.path ?? req.url ?? '').split('?')[0];
    if (EXENTAS.some((seg) => ruta.includes(seg))) return next.handle();

    return from(this.billing.estado(user.tenantId)).pipe(
      switchMap((estado) => {
        if (estado.estado === BillingBlockState.AL_CORRIENTE) {
          return next.handle();
        }
        const metodo = (req.method ?? 'GET').toUpperCase();
        if (
          estado.estado === BillingBlockState.SOLO_LECTURA &&
          METODOS_LECTURA.has(metodo)
        ) {
          return next.handle();
        }
        const bloqueado = estado.estado === BillingBlockState.BLOQUEADO;
        throw new ForbiddenException({
          code: bloqueado ? 'TENANT_PAYMENT_BLOCKED' : 'TENANT_PAYMENT_READONLY',
          message: bloqueado
            ? 'Tu cuenta está bloqueada por falta de pago. Regulariza tu adeudo para reactivarla.'
            : 'Tu cuenta tiene un adeudo vencido: por ahora solo puedes consultar información. Regulariza el pago para volver a capturar.',
          estado: estado.estado,
          diasMora: estado.diasMora,
          diasParaBloqueo: estado.diasParaBloqueo,
          adeudo: estado.adeudo,
          periodosVencidos: estado.periodosVencidos,
          contacto: this.contacto(),
        });
      }),
    );
  }

  private contacto() {
    return {
      nombre: this.config.get<string>('NEXUS_SUPPORT_NAME') || 'Nexus Q Tech',
      email:
        this.config.get<string>('NEXUS_SUPPORT_EMAIL') ||
        'soporte@nexusqtech.com',
      telefono: this.config.get<string>('NEXUS_SUPPORT_PHONE') || '',
      whatsapp: this.config.get<string>('NEXUS_SUPPORT_WHATSAPP') || '',
    };
  }
}
