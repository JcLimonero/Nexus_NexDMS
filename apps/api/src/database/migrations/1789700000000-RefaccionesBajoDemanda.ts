import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 · Parte 3 — Refacciones bajo demanda (pedido especial).
 *
 * - `parts.is_on_demand`: la refacción no se mantiene en stock; se pide cuando
 *   un trabajo la necesita.
 * - `purchase_requisitions`: cola de "por pedir". Al cotizar una parte bajo
 *   demanda (o sin stock) se genera una requisición pendiente; luego se
 *   convierte en orden de compra.
 */
export class RefaccionesBajoDemanda1789700000000 implements MigrationInterface {
  name = 'RefaccionesBajoDemanda1789700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "parts" ADD COLUMN "is_on_demand" boolean NOT NULL DEFAULT false`,
    );

    await q.query(`
      CREATE TABLE "purchase_requisitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "source_type" varchar(30) NOT NULL DEFAULT 'manual',
        "source_id" uuid,
        "note" varchar(300),
        "requested_by" uuid,
        "purchase_order_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_requisitions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pr_part" FOREIGN KEY ("part_id")
          REFERENCES "parts"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_pr_status" CHECK ("status" IN ('PENDING','ORDERED','CANCELLED'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_pr_tenant_status" ON "purchase_requisitions" ("tenant_id", "status")`,
    );
    await q.query(
      `CREATE INDEX "IDX_pr_branch" ON "purchase_requisitions" ("branch_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "purchase_requisitions"`);
    await q.query(`ALTER TABLE "parts" DROP COLUMN "is_on_demand"`);
  }
}
