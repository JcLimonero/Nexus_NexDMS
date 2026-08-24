import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

/** Contexto de ejecución mínimo con el `user` del request. */
const ctx = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('deja pasar al administrador de plataforma (admin:true)', () => {
    expect(guard.canActivate(ctx({ admin: true }))).toBe(true);
  });

  it('bloquea a un usuario de tenant aunque tenga el rol string SUPERADMIN', () => {
    expect(() =>
      guard.canActivate(
        ctx({ admin: false, roles: ['SUPERADMIN'], tenantId: 't1' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('bloquea si no hay usuario', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
