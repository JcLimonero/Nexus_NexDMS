import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R1 — Presupuesto con autorización parcial por línea.
 *
 * El cliente deja de aceptar o rechazar el presupuesto completo: ahora decide
 * trabajo por trabajo. Cada línea gana estado propio, urgencia, nota del
 * técnico y fotos de lo que se recomienda cambiar; el presupuesto guarda la
 * firma del cliente al autorizar.
 */
export class PresupuestoAutorizacionParcial1789100000000
  implements MigrationInterface
{
  name = 'PresupuestoAutorizacionParcial1789100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TYPE "quotation_items_line_status_enum" AS ENUM('PENDING','ACCEPTED','REJECTED','CALLBACK')`,
    );
    await q.query(
      `CREATE TYPE "quotation_items_urgency_enum" AS ENUM('URGENTE','RECOMENDADO','OPCIONAL')`,
    );

    await q.query(`
      ALTER TABLE "quotation_items"
        ADD COLUMN "line_status" "quotation_items_line_status_enum" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN "urgency" "quotation_items_urgency_enum" NOT NULL DEFAULT 'RECOMENDADO',
        ADD COLUMN "technician_note" text,
        ADD COLUMN "client_line_note" text
    `);

    await q.query(`
      CREATE TABLE "quotation_item_photos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quotation_item_id" uuid NOT NULL,
        "storage_key" varchar(500) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quotation_item_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotation_item_photos_item" FOREIGN KEY ("quotation_item_id")
          REFERENCES "quotation_items"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_quotation_item_photos_item" ON "quotation_item_photos" ("quotation_item_id")`,
    );

    await q.query(
      `ALTER TABLE "quotations" ADD COLUMN "signature_key" varchar(500)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "quotations" DROP COLUMN "signature_key"`);
    await q.query(`DROP TABLE "quotation_item_photos"`);
    await q.query(`
      ALTER TABLE "quotation_items"
        DROP COLUMN "client_line_note",
        DROP COLUMN "technician_note",
        DROP COLUMN "urgency",
        DROP COLUMN "line_status"
    `);
    await q.query(`DROP TYPE "quotation_items_urgency_enum"`);
    await q.query(`DROP TYPE "quotation_items_line_status_enum"`);
  }
}
