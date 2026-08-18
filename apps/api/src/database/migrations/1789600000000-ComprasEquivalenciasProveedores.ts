import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 · Parte 4 — Compras: equivalencias de número de parte, proveedor
 * principal por refacción e historial de precios por proveedor (top 3).
 */
export class ComprasEquivalenciasProveedores1789600000000
  implements MigrationInterface
{
  name = 'ComprasEquivalenciasProveedores1789600000000';

  public async up(q: QueryRunner): Promise<void> {
    // Proveedor principal por refacción (para requisiciones y sugerencias).
    await q.query(
      `ALTER TABLE "parts" ADD COLUMN "preferred_supplier_id" uuid`,
    );
    await q.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "FK_parts_pref_supplier"
        FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL`,
    );

    // Equivalencias: otros números de parte que refieren a la misma refacción.
    await q.query(`
      CREATE TABLE "part_equivalences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "equivalent_sku" varchar(100) NOT NULL,
        "brand" varchar(120),
        "note" varchar(300),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_part_equivalences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pe_part" FOREIGN KEY ("part_id")
          REFERENCES "parts"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_part_equivalence" ON "part_equivalences" ("part_id", "equivalent_sku")`,
    );
    await q.query(
      `CREATE INDEX "IDX_pe_tenant_sku" ON "part_equivalences" ("tenant_id", "equivalent_sku")`,
    );

    // Historial de precio por proveedor para una parte (base del top 3).
    await q.query(`
      CREATE TABLE "part_suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "supplier_sku" varchar(100),
        "last_price" numeric(12,2) NOT NULL DEFAULT 0,
        "last_purchased_at" date,
        "times_purchased" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_part_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ps_part" FOREIGN KEY ("part_id")
          REFERENCES "parts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ps_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_part_supplier" ON "part_suppliers" ("part_id", "supplier_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_ps_tenant" ON "part_suppliers" ("tenant_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "part_suppliers"`);
    await q.query(`DROP TABLE "part_equivalences"`);
    await q.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "FK_parts_pref_supplier"`,
    );
    await q.query(`ALTER TABLE "parts" DROP COLUMN "preferred_supplier_id"`);
  }
}
