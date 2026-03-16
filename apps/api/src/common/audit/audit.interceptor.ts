import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { auditContext } from './audit-context';

interface RequestWithUser {
  user?: { sub?: string; tenantId?: string };
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: { 'user-agent'?: string };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    const data = {
      userId: user?.sub,
      tenantId: user?.tenantId,
      ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
      userAgent: req.headers?.['user-agent'],
    };
    return new Observable((subscriber) => {
      auditContext.run(data, () => {
        next
          .handle()
          .pipe(
            tap(
              () => {},
              () => {},
              () => {},
            ),
          )
          .subscribe(subscriber);
      });
    });
  }
}
