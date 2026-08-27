import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conversaciones de WhatsApp y su transcripción.
 *
 * Hasta ahora un chat de WhatsApp no dejaba rastro: lo único que se guardaba
 * era la sesión del bot en Redis, que es un borrador del flujo de agendado
 * —expira a los 30 minutos y no contiene un solo mensaje—. Al terminar la
 * conversación no quedaba nada que consultar.
 *
 * `portal_messages` no sirve para esto: es la mensajería del portal del
 * cliente, cuelga de una orden de servicio y no tiene que ver con WhatsApp.
 *
 * La conversación abierta es única por (sucursal, teléfono): quien escribe
 * está en un solo chat a la vez con ese número. Las cerradas no entran en el
 * índice, así que el historial se acumula sin estorbar.
 */
export class ConversacionesWhatsapp1790900000000 implements MigrationInterface {
  name = 'ConversacionesWhatsapp1790900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "whatsapp_conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "client_id" uuid,
        "phone" varchar(30) NOT NULL,
        "contact_name" varchar(200),
        "state" varchar(20) NOT NULL DEFAULT 'BOT',
        "escalation_reason" varchar(30),
        "assigned_user_id" uuid,
        "appointment_id" uuid,
        "last_message_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_inbound_at" TIMESTAMP,
        "unread_count" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_wac_state" CHECK ("state" IN ('BOT','WITH_AGENT','BOOKED','CANCELLED','EXPIRED')),
        CONSTRAINT "CHK_wac_reason" CHECK ("escalation_reason" IN ('ASKED_FOR_HUMAN','BOT_LOOPED','BOT_WAS_WRONG')),
        CONSTRAINT "FK_wac_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wac_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wac_user" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wac_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL
      )`);

    await q.query(
      `CREATE INDEX "IDX_wac_tenant" ON "whatsapp_conversations" ("tenant_id")`,
    );
    // El orden natural de la bandeja: lo más reciente arriba, por sucursal.
    await q.query(
      `CREATE INDEX "IDX_wac_branch_last" ON "whatsapp_conversations" ("branch_id", "last_message_at" DESC)`,
    );
    // Un solo chat abierto por teléfono y sucursal. Las cerradas quedan fuera
    // para que el histórico no choque contra el índice.
    await q.query(
      `CREATE UNIQUE INDEX "UQ_wac_open_per_phone"
         ON "whatsapp_conversations" ("branch_id", "phone")
         WHERE "state" IN ('BOT','WITH_AGENT')`,
    );

    await q.query(`
      CREATE TABLE "whatsapp_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "conversation_id" uuid NOT NULL,
        "author" varchar(10) NOT NULL,
        "user_id" uuid,
        "body" text,
        "attachment_key" varchar(500),
        "attachment_type" varchar(20),
        "wa_message_id" varchar(100),
        "direction" varchar(3) NOT NULL,
        "status" varchar(20),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_messages" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_wam_author" CHECK ("author" IN ('CUSTOMER','BOT','AGENT')),
        CONSTRAINT "CHK_wam_direction" CHECK ("direction" IN ('IN','OUT')),
        CONSTRAINT "FK_wam_conversation" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wam_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )`);

    await q.query(
      `CREATE INDEX "IDX_wam_conversation" ON "whatsapp_messages" ("conversation_id", "created_at")`,
    );
    // Segundo cinturón contra los reintentos de Meta: el primero es la llave
    // en Redis, pero esa expira y la base es la que no debe duplicar nunca.
    await q.query(
      `CREATE UNIQUE INDEX "UQ_wam_wa_message_id"
         ON "whatsapp_messages" ("wa_message_id")
         WHERE "wa_message_id" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "whatsapp_messages"`);
    await q.query(`DROP TABLE "whatsapp_conversations"`);
  }
}
