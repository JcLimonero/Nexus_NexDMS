import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { RoleEnum, ScopeEnum } from './entities/user.entity';

/**
 * C1 — escalada de privilegios: SUPERADMIN es un rol de PLATAFORMA y no puede
 * asignarse a usuarios de un concesionario. El chequeo va al inicio de create/
 * actualizar, así que salta antes de tocar la BD (deps sin mockear).
 */
describe('UsersService — bloqueo de SUPERADMIN (C1)', () => {
  const svc = new (UsersService as unknown as { new (): UsersService })();

  it('create rechaza asignar SUPERADMIN', async () => {
    await expect(
      svc.create('t1', {
        firstName: 'ZZ',
        lastName: 'Hack',
        email: 'x@x.mx',
        password: 'Segura123',
        scope: ScopeEnum.GLOBAL,
        roles: [RoleEnum.SUPERADMIN],
        branchIds: ['b1'],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('actualizar rechaza asignar SUPERADMIN', async () => {
    await expect(
      svc.actualizar('t1', 'u1', { roles: [RoleEnum.SUPERADMIN] }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no bloquea roles normales de tenant', () => {
    expect(() =>
      (
        svc as unknown as { rechazarSuperadmin: (r: RoleEnum[]) => void }
      ).rechazarSuperadmin([RoleEnum.ADMIN, RoleEnum.CASHIER]),
    ).not.toThrow();
  });
});
