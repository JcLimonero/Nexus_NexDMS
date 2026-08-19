import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Caja de verdad: movimientos de efectivo, arqueo y varios cajeros.
 *
 * Tres carencias que un cajero nota el primer día:
 *
 *  1. El dinero solo entraba por ventas. Ahora hay movimientos manuales
 *     —retiros a la caja fuerte, depósitos, gastos de caja chica—, que mueven
 *     el efectivo esperado sin ser una venta.
 *
 *  2. El cierre era un monto único escrito a mano. Ahora se guarda el arqueo
 *     por denominaciones (cuántos billetes y monedas de cada valor), y el
 *     efectivo contado sale de esa cuenta.
 *
 *  3. Una sola sesión abierta por sucursal. Ahora el candado es por CAJERO:
 *     dos personas en la misma sucursal pueden tener su propia caja abierta.
 */
export class CajaArqueoYMovimientos1788700000000
  implements MigrationInterface
{
  name = 'CajaArqueoYMovimientos1788700000000';

  public async up(q: QueryRunner): Promise<void> {
    // Efectivo contado por denominaciones y su total; y el esperado calculado.
    await q.query(`
      ALTER TABLE "cash_sessions"
        ADD "denominations" jsonb,
        ADD "counted_cash" numeric(12,2),
        ADD "expected_cash" numeric(12,2)`);

    // Movimientos manuales de efectivo dentro de una sesión.
    await q.query(`
      CREATE TABLE "cash_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "cash_session_id" uuid NOT NULL,
        "kind" varchar(12) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "concept" varchar(200) NOT NULL,
        "reference" varchar(120),
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_movements" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_cm_kind" CHECK ("kind" IN ('DEPOSIT','WITHDRAWAL','EXPENSE')),
        CONSTRAINT "CHK_cm_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_cm_session" FOREIGN KEY ("cash_session_id")
          REFERENCES "cash_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cm_user" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )`);
    await q.query(
      `CREATE INDEX "IDX_cm_session" ON "cash_movements" ("cash_session_id")`,
    );

    // El candado de "una caja abierta" pasa de la sucursal al cajero: se
    // permite una sesión OPEN por usuario, no por sucursal.
    await q.query(`
      CREATE UNIQUE INDEX "UQ_cash_open_por_usuario"
        ON "cash_sessions" ("user_id")
        WHERE "status" = 'OPEN'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "UQ_cash_open_por_usuario"`);
    await q.query(`DROP TABLE "cash_movements"`);
    await q.query(`
      ALTER TABLE "cash_sessions"
        DROP COLUMN "expected_cash",
        DROP COLUMN "counted_cash",
        DROP COLUMN "denominations"`);
  }
}
