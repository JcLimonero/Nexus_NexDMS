import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: { tenantId?: string; sub?: string };
}

export function getThrottlerTracker(
  req: RequestWithUser,
  _context: ExecutionContext,
): string {
  const user = req.user;
  if (user?.tenantId && user?.sub) {
    return `tenant:${user.tenantId}:user:${user.sub}`;
  }
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';
  return `ip:${ip}`;
}

export function getThrottlerKey(
  context: ExecutionContext,
  tracker: string,
  throttlerName: string,
): string {
  return `${tracker}:${throttlerName}`;
}
