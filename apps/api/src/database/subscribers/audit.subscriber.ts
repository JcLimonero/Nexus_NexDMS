import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { AuditLog } from '../../modules/audit-log/entities/audit-log.entity';
import { AuditActionEnum } from '../../modules/audit-log/entities/audit-log.entity';
import { auditContext } from '../../common/audit/audit-context';

const AUDITED_TABLES = [
  'sales',
  'service_orders',
  'purchase_orders',
  'unit_sales',
  'quotations',
  'appointments',
  'warehouse_transfers',
  'stock_movements',
];

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(private readonly dataSource: DataSource) {}

  private getTableName(entity: object): string | null {
    try {
      const metadata = this.dataSource.entityMetadatas.find(
        (m) => m.target === (entity as { constructor: unknown }).constructor,
      );
      return metadata?.tableName ?? null;
    } catch {
      return null;
    }
  }

  private getContext() {
    return auditContext.getStore() ?? {};
  }

  private sanitizePayload(obj: object | undefined): object | null {
    if (!obj || typeof obj !== 'object') return null;
    const copy = { ...obj };
    const sensitive = [
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'totpSecret',
      'refreshToken',
      'authorization',
    ];
    for (const key of Object.keys(copy)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        (copy as Record<string, unknown>)[key] = '[REDACTED]';
      }
    }
    return copy;
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    const tableName = this.getTableName(event.entity as object);
    if (!tableName || !AUDITED_TABLES.includes(tableName)) return;

    const ctx = this.getContext();
    const recordId = (event.entity as { id?: string })?.id ?? null;
    const payloadAfter = this.sanitizePayload(
      event.entity as Record<string, unknown>,
    );

    await event.manager.insert(AuditLog, {
      tenantId: ctx.tenantId ?? null,
      userId: ctx.userId ?? null,
      action: AuditActionEnum.CREATE,
      tableName,
      recordId,
      payloadBefore: null,
      payloadAfter,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  async afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    const entity = event.entity;
    if (!entity) return;

    const tableName = this.getTableName(entity as object);
    if (!tableName || !AUDITED_TABLES.includes(tableName)) return;

    const ctx = this.getContext();
    const recordId = (entity as { id?: string })?.id ?? null;
    const payloadBefore = event.databaseEntity
      ? this.sanitizePayload(event.databaseEntity as Record<string, unknown>)
      : null;
    const payloadAfter = this.sanitizePayload(
      entity as Record<string, unknown>,
    );

    await event.manager?.insert(AuditLog, {
      tenantId: ctx.tenantId ?? null,
      userId: ctx.userId ?? null,
      action: AuditActionEnum.UPDATE,
      tableName,
      recordId,
      payloadBefore,
      payloadAfter,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  async afterRemove(event: RemoveEvent<unknown>): Promise<void> {
    const entity = event.entity;
    if (!entity) return;

    const tableName = this.getTableName(entity as object);
    if (!tableName || !AUDITED_TABLES.includes(tableName)) return;

    const ctx = this.getContext();
    const recordId = (entity as { id?: string })?.id ?? null;
    const payloadBefore = this.sanitizePayload(
      entity as Record<string, unknown>,
    );

    await event.manager?.insert(AuditLog, {
      tenantId: ctx.tenantId ?? null,
      userId: ctx.userId ?? null,
      action: AuditActionEnum.DELETE,
      tableName,
      recordId,
      payloadBefore,
      payloadAfter: null,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }
}
