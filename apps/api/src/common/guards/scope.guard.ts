import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const qb = request.scopeQueryBuilder;
    if (!qb) return true; // Si no hay QB registrado, dejar pasar

    switch (user.scope) {
      case 'BRANCH':
        qb.andWhere('e.branch_id = :bid', { bid: user.branchId });
        break;
      case 'BRAND':
        qb.innerJoin('branches', 's', 's.id = e.branch_id')
          .andWhere('s.brand_id = :bid', { bid: user.brandId });
        break;
      // GLOBAL: sin filtro adicional
    }
    return true;
  }
}
