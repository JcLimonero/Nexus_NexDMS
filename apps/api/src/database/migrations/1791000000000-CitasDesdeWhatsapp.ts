import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Liga la cita con el chat de WhatsApp que la originó.
 *
 * Hasta ahora `createPublic()` guardaba toda cita agendada fuera del DMS
 * como `PUBLIC_PORTAL`, así que una cita del bot era indistinguible de una
 * del portal web y no había forma de volver al chat que la generó.
 */
export class CitasDesdeWhatsapp1791000000000 implements MigrationInterface {
  name = 'CitasDesdeWhatsapp1791000000000';

  /**
   * Fuera de transacción: `ALTER TYPE ... ADD VALUE` no surte efecto dentro
   * de la que abre TypeORM por default —la migración queda registrada pero
   * el valor no queda agregado— y el fallo es silencioso. Mismo motivo que
   * `RolRecepcion1787300000000`.
   */
  transaction = false;

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TYPE "appointments_origin_enum" ADD VALUE IF NOT EXISTS 'WHATSAPP_BOT'`,
    );

    await q.query(
      `ALTER TABLE "appointments" ADD "whatsapp_conversation_id" uuid`,
    );
    await q.query(`
      ALTER TABLE "appointments"
        ADD CONSTRAINT "FK_appointments_whatsapp_conversation"
        FOREIGN KEY ("whatsapp_conversation_id")
        REFERENCES "whatsapp_conversations"("id")
        ON DELETE SET NULL
    `);
    // Para "¿cuántas citas trae WhatsApp?": sin índice, esa consulta sería un
    // recorrido completo de la tabla en cuanto el histórico crezca.
    await q.query(
      `CREATE INDEX "IDX_appointments_whatsapp_conversation" ON "appointments" ("whatsapp_conversation_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "IDX_appointments_whatsapp_conversation"`);
    await q.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_whatsapp_conversation"`,
    );
    await q.query(
      `ALTER TABLE "appointments" DROP COLUMN "whatsapp_conversation_id"`,
    );
    // Postgres no permite quitar un valor de un enum sin recrear el tipo y
    // reescribir las columnas que lo usan. Como el valor es aditivo y no
    // rompe nada al quedarse, se deja: revertirlo costaría más de lo que
    // resuelve (mismo trato que `RolRecepcion1787300000000`).
  }
}
