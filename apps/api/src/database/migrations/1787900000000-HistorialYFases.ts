import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dos huecos que se notan en cuanto el taller lleva tiempo abierto.
 *
 * **Historial de propiedad.** Un vehículo cambia de dueño y hoy solo se
 * guarda el actual: al venderse, todo su historial de servicio pasa a
 * colgar de quien lo compró, y el anterior pierde de golpe lo que hizo.
 * `customer_vehicles.owner_id` se queda como está —es el dueño de hoy y
 * medio sistema lo consulta— y aquí se añade la cadena completa, con la
 * fecha en que cada uno lo tuvo.
 *
 * **Fases del paquete.** Un kit ya dice qué refacciones lleva y cuánta mano
 * de obra en total, pero no por dónde pasa la unidad. Sin eso no se puede
 * decir en qué va ni si se está tardando: el total solo se sabe al final,
 * cuando ya no sirve para reaccionar. Las fases se definen en el paquete y
 * se copian a la orden al aplicarlo, porque la orden tiene que conservar el
 * plan con el que se abrió aunque el paquete cambie después.
 */
export class HistorialYFases1787900000000 implements MigrationInterface {
  name = 'HistorialYFases1787900000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── Quién ha tenido el vehículo, y cuándo ────────────────
    await q.query(`
      CREATE TABLE "vehicle_ownerships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "from_date" date NOT NULL,
        "to_date" date,
        "source" varchar(30) NOT NULL DEFAULT 'MANUAL',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_ownerships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vehicle_ownerships_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "customer_vehicles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_ownerships_client" FOREIGN KEY ("client_id")
          REFERENCES "clients"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_vehicle_ownerships_vehiculo" ON "vehicle_ownerships" ("vehicle_id", "from_date")`,
    );
    await q.query(
      `CREATE INDEX "IDX_vehicle_ownerships_cliente" ON "vehicle_ownerships" ("client_id")`,
    );
    // Un vehículo no puede tener dos dueños vigentes a la vez. Es lo que
    // impide que un traspaso a medias deje el historial contradiciéndose.
    await q.query(`
      CREATE UNIQUE INDEX "UQ_vehicle_ownerships_vigente"
        ON "vehicle_ownerships" ("vehicle_id") WHERE "to_date" IS NULL`);

    // Cada vehículo arranca con su dueño de hoy, desde que se dio de alta:
    // sin esto la pantalla de historial saldría vacía para toda la cartera.
    await q.query(`
      INSERT INTO "vehicle_ownerships"
        ("tenant_id", "vehicle_id", "client_id", "from_date", "source", "notes")
      SELECT v."tenant_id", v."id", v."owner_id", v."created_at"::date,
             'ALTA', 'Dueño registrado al dar de alta el vehículo'
        FROM "customer_vehicles" v
       WHERE v."deleted_at" IS NULL`);

    // ── Fases del paquete de servicio ────────────────────────
    await q.query(`
      CREATE TABLE "service_kit_phases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kit_id" uuid NOT NULL,
        "sequence" int NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "estimated_min" int NOT NULL DEFAULT 30,
        "role" varchar(40),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_kit_phases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_kit_phases_kit" FOREIGN KEY ("kit_id")
          REFERENCES "service_kits"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_service_kit_phases_orden" UNIQUE ("kit_id", "sequence")
      )`);

    // ── Fases de una orden concreta ──────────────────────────
    await q.query(`
      CREATE TABLE "service_order_phases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "kit_phase_id" uuid,
        "sequence" int NOT NULL,
        "name" varchar(200) NOT NULL,
        "estimated_min" int NOT NULL DEFAULT 30,
        "role" varchar(40),
        "assigned_user_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'PENDIENTE',
        "started_at" TIMESTAMP,
        "finished_at" TIMESTAMP,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_phases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_order_phases_orden" FOREIGN KEY ("service_order_id")
          REFERENCES "service_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_order_phases_fase" FOREIGN KEY ("kit_phase_id")
          REFERENCES "service_kit_phases"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_service_order_phases_usuario" FOREIGN KEY ("assigned_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_service_order_phases_orden" UNIQUE ("service_order_id", "sequence")
      )`);
    await q.query(
      `CREATE INDEX "IDX_service_order_phases_estado" ON "service_order_phases" ("status")`,
    );

    await this.seedFases(q);
  }

  /**
   * Fases de partida para los kits que ya existen.
   *
   * Son las cuatro por las que pasa cualquier unidad en un taller de
   * concesionario. Sin ellas los kits quedarían con el tablero vacío y
   * habría que capturarlas a mano una por una antes de poder ver nada.
   */
  private async seedFases(q: QueryRunner): Promise<void> {
    const kits: { id: string; labor_minutes: number }[] = await q.query(
      `SELECT "id", "labor_minutes" FROM "service_kits"`,
    );
    // Reparto del baremo del kit entre las fases, en porcentaje.
    const plantilla: [number, string, string, number, string][] = [
      [1, 'Recepción y diagnóstico', 'MECHANIC', 0.15, 'Confirmar el trabajo y revisar la unidad'],
      [2, 'Refacciones', 'WAREHOUSE', 0.1, 'Surtir las piezas del paquete'],
      [3, 'Ejecución', 'MECHANIC', 0.6, 'El trabajo propiamente dicho'],
      [4, 'Control de calidad y entrega', 'MANAGER', 0.15, 'Verificar y preparar la entrega'],
    ];

    for (const kit of kits) {
      const total = Number(kit.labor_minutes) || 60;
      for (const [seq, nombre, rol, parte, desc] of plantilla) {
        await q.query(
          `INSERT INTO "service_kit_phases"
             ("kit_id","sequence","name","description","estimated_min","role")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [kit.id, seq, nombre, desc, Math.max(5, Math.round(total * parte)), rol],
        );
      }
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "service_order_phases"`);
    await q.query(`DROP TABLE "service_kit_phases"`);
    await q.query(`DROP TABLE "vehicle_ownerships"`);
  }
}
