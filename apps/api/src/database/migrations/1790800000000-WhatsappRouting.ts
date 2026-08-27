import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enrutamiento del webhook de WhatsApp por sucursal.
 *
 * El payload de Meta trae `metadata.phone_number_id`: es la única pista de a
 * qué número llegó el mensaje y, por lo tanto, de qué sucursal es. Para poder
 * buscar por él hace falta tenerlo en claro. `whatsapp_phone_id` se guardaba
 * cifrado con AES-CBC, que no es determinista: dos cifrados del mismo id no
 * coinciden, así que la columna no se puede indexar ni consultar.
 *
 * El id del número no es un secreto — identifica al número, no autoriza nada;
 * quien manda mensajes es el token, y ese se queda cifrado. Por eso la columna
 * se reemplaza en vez de duplicar el mismo dato en dos formas.
 *
 * El valor anterior se pierde y hay que recapturarlo en Configuración. No
 * rompe nada que hoy funcione: `WhatsAppProvider` leía las credenciales de
 * variables de entorno, nunca de esta columna.
 */
export class WhatsappRouting1790800000000 implements MigrationInterface {
  name = 'WhatsappRouting1790800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "branch_config" DROP COLUMN IF EXISTS "whatsapp_phone_id"`,
    );
    await q.query(
      `ALTER TABLE "branch_config" ADD COLUMN "whatsapp_phone_number_id" varchar(50)`,
    );
    // Parcial: varias sucursales sin número configurado no se estorban entre sí.
    await q.query(
      `CREATE UNIQUE INDEX "UQ_branch_config_wa_phone_number_id"
         ON "branch_config" ("whatsapp_phone_number_id")
         WHERE "whatsapp_phone_number_id" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_branch_config_wa_phone_number_id"`);
    await q.query(
      `ALTER TABLE "branch_config" DROP COLUMN "whatsapp_phone_number_id"`,
    );
    await q.query(
      `ALTER TABLE "branch_config" ADD COLUMN "whatsapp_phone_id" text`,
    );
  }
}
