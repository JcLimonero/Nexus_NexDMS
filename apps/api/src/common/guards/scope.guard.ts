import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';
import type { UserPayload } from '../../modules/auth/strategies/jwt.strategy';
import { ScopeEnum } from '../../modules/users/entities/user.entity';

interface RequestWithScope {
  user?: UserPayload;
  scopeQueryBuilder?: SelectQueryBuilder<object>;
}

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<RequestWithScope>();
    const user = request.user;
    if (!user) return false;

    const qb = request.scopeQueryBuilder;
    if (!qb) return true; // Si no hay QB registrado, dejar pasar

    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('e.branch_id = :bid', { bid: user.branchId });
        break;
      case ScopeEnum.BRAND:
        qb.innerJoin('branches', 's', 's.id = e.branch_id').andWhere(
          's.brand_id = :bid',
          { bid: user.brandId },
        );
        break;
      // GLOBAL: sin filtro adicional
    }
    return true;
  }
}
