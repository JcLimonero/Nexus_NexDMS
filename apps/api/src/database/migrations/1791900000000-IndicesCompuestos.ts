import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices compuestos para las consultas típicas multi-tenant (filtro por
 * tenant + estado/sucursal y orden por fecha). Sin ellos, con muchos registros
 * por cliente, Postgres usa un solo índice de una columna y filtra/ordena el
 * resto en memoria. Se crean IF NOT EXISTS; las tablas hoy son pequeñas, así
 * que el CREATE INDEX normal no molesta (a gran escala se usaría CONCURRENTLY).
 */
export class IndicesCompuestos1791900000000 implements MigrationInterface {
  name = 'IndicesCompuestos1791900000000';

  private readonly indices: { tabla: string; nombre: string; cols: string }[] = [
    // Órdenes de servicio: listados por estado y por sucursal, orden por fecha.
    { tabla: 'service_orders', nombre: 'IDX_so_tenant_status_created', cols: 'tenant_id, status, created_at DESC' },
    { tabla: 'service_orders', nombre: 'IDX_so_tenant_branch_created', cols: 'tenant_id, branch_id, created_at DESC' },
    // Movimientos de inventario: kardex por parte y por sucursal.
    { tabla: 'stock_movements', nombre: 'IDX_sm_tenant_part_created', cols: 'tenant_id, part_id, created_at DESC' },
    { tabla: 'stock_movements', nombre: 'IDX_sm_tenant_branch_created', cols: 'tenant_id, branch_id, created_at DESC' },
    // Ventas de mostrador: por estado y por sucursal.
    { tabla: 'sales', nombre: 'IDX_sales_tenant_status_created', cols: 'tenant_id, status, created_at DESC' },
    { tabla: 'sales', nombre: 'IDX_sales_tenant_branch_created', cols: 'tenant_id, branch_id, created_at DESC' },
    // Bitácora de notificaciones: consulta por tenant + fecha.
    { tabla: 'notification_logs', nombre: 'IDX_notif_tenant_created', cols: 'tenant_id, created_at DESC' },
    // Auditoría: por tenant + tabla + fecha.
    { tabla: 'audit_logs', nombre: 'IDX_audit_tenant_table_created', cols: 'tenant_id, table_name, created_at DESC' },
    // Refacciones: filtro base por tenant + sucursal.
    { tabla: 'parts', nombre: 'IDX_parts_tenant_branch', cols: 'tenant_id, branch_id' },
    // Cobros SaaS: por cliente y periodo (panorama/morosos).
    { tabla: 'saas_payments', nombre: 'IDX_saaspay_tenant_status', cols: 'tenant_id, status' },
  ];

  public async up(q: QueryRunner): Promise<void> {
    for (const i of this.indices) {
      // Solo si la tabla existe (defensivo entre despliegues).
      const existe = await q.query(
        `SELECT to_regclass('public.${i.tabla}') IS NOT NULL AS ok`,
      );
      if (!existe?.[0]?.ok) continue;
      await q.query(
        `CREATE INDEX IF NOT EXISTS "${i.nombre}" ON "${i.tabla}" (${i.cols})`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const i of this.indices) {
      await q.query(`DROP INDEX IF EXISTS "${i.nombre}"`);
    }
  }
}
