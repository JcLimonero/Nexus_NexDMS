import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserPayload } from '../../modules/auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserPayload =>
    ctx.switchToHttp().getRequest<{ user: UserPayload }>().user,
);
