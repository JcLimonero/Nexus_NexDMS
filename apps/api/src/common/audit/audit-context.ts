import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContextData {
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
}

export const auditContext = new AsyncLocalStorage<AuditContextData>();
