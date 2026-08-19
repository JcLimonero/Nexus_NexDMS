import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 · Devoluciones y garantías de refacción, en dos direcciones:
 * - CLIENT_RETURN: el cliente devuelve/reclama una pieza que le vendí.
 * - SUPPLIER_CLAIM: reclamo al proveedor una pieza defectuosa que le compré.
 *
 * El efecto en inventario depende de la dirección y de si la pieza reingresa
 * a stock vendible (una defectuosa no reingresa; se reclama al proveedor).
 */
export class DevolucionesRefaccion1789800000000 implements MigrationInterface {
  name = 'DevolucionesRefaccion1789800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "part_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "folio" varchar(30) NOT NULL,
        "kind" varchar(20) NOT NULL,
        "client_id" uuid,
        "supplier_id" uuid,
        "is_warranty" boolean NOT NULL DEFAULT false,
        "restock" boolean NOT NULL DEFAULT true,
        "reason" varchar(400),
        "refund_method" varchar(20) NOT NULL DEFAULT 'NONE',
        "refund_total" numeric(12,2) NOT NULL DEFAULT 0,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_part_returns" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_pret_kind" CHECK ("kind" IN ('CLIENT_RETURN','SUPPLIER_CLAIM')),
        CONSTRAINT "CHK_pret_refund" CHECK ("refund_method" IN ('CASH','CREDIT_NOTE','REPLACEMENT','NONE'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_pret_tenant" ON "part_returns" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_pret_branch" ON "part_returns" ("branch_id")`,
    );

    await q.query(`
      CREATE TABLE "part_return_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "return_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unit_price" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "condition" varchar(12) NOT NULL DEFAULT 'GOOD',
        CONSTRAINT "PK_part_return_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pri_return" FOREIGN KEY ("return_id")
          REFERENCES "part_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_pri_condition" CHECK ("condition" IN ('GOOD','DEFECTIVE'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_pri_return" ON "part_return_items" ("return_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "part_return_items"`);
    await q.query(`DROP TABLE "part_returns"`);
  }
}
