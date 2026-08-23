import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita pg_stat_statements para observar las consultas más costosas en
 * producción (base del tuning). Es defensiva: si el proveedor no permite crear
 * la extensión (requiere shared_preload_libraries), no rompe el despliegue —
 * solo se anota y se sigue.
 */
export class PgStatStatements1792000000000 implements MigrationInterface {
  name = 'PgStatStatements1792000000000';

  public async up(q: QueryRunner): Promise<void> {
    try {
      await q.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`);
    } catch {
      // Requiere que el proveedor lo tenga en shared_preload_libraries.
      // Si no, se activa desde el panel del proveedor; no bloqueamos el deploy.
    }
  }

  public async down(): Promise<void> {
    // No se elimina la extensión: puede estar en uso por otras herramientas.
  }
}
