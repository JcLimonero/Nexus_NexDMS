import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Documentos requeridos para vender una unidad.
 *
 * Qué papeles se exigen no es fijo: depende de a QUIÉN se le vende (persona
 * física o moral), CÓMO se paga (contado, crédito de agencia, crédito
 * bancario) y QUÉ se vende (moto, auto, camión…). Un crédito bancario a una
 * empresa pide comprobante de ingresos, acta constitutiva y poder; un contado
 * a una persona, casi nada. Esa matriz es la que aquí se vuelve configurable.
 *
 * Tres tablas, calcadas del modelo de NexFile pero adaptadas al esquema de
 * aquí:
 *
 *  - `sale_document_types`  — catálogo de tipos de documento del tenant.
 *  - `sale_document_rules`  — la matriz: qué documento exige cada combinación.
 *  - `sale_documents`       — los archivos subidos a una venta concreta.
 *
 * Los documentos del cliente (INE, comprobante de domicilio) NO se reponen
 * aquí: viven en `client_documents`, que ya existe, y se reutilizan entre sus
 * compras. Un tipo de documento declara su ámbito para saber de dónde sale.
 */
export class DocumentosVentaUnidades1788400000000 implements MigrationInterface {
  name = 'DocumentosVentaUnidades1788400000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── Catálogo de tipos de documento ──
    // `scope` decide de dónde se cumple el requisito:
    //   CLIENT  → con un documento del expediente del cliente, reutilizable.
    //   SALE    → con uno subido a esta venta, propio de la operación.
    await q.query(`
      CREATE TABLE "sale_document_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "key" varchar(60) NOT NULL,
        "name" varchar(160) NOT NULL,
        "scope" varchar(10) NOT NULL DEFAULT 'SALE',
        "has_expiration" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_document_types" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sdt_scope" CHECK ("scope" IN ('CLIENT','SALE')),
        CONSTRAINT "UQ_sdt_tenant_key" UNIQUE ("tenant_id","key")
      )`);
    await q.query(
      `CREATE INDEX "IDX_sdt_tenant" ON "sale_document_types" ("tenant_id")`,
    );

    // ── Matriz de requisitos ──
    // Cada eje admite NULL = "cualquiera": así el INE se pide siempre con una
    // sola fila (los tres ejes en blanco) y el comprobante de ingresos solo se
    // añade para crédito, sin repetir la regla por cada tipo de vehículo.
    await q.query(`
      CREATE TABLE "sale_document_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "document_type_id" uuid NOT NULL,
        "client_type" varchar(20),
        "financing_type" varchar(20),
        "vehicle_type" varchar(20),
        "is_required" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_document_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sdr_type" FOREIGN KEY ("document_type_id")
          REFERENCES "sale_document_types"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_sdr_tenant" ON "sale_document_rules" ("tenant_id")`,
    );

    // ── Documentos subidos a una venta ──
    await q.query(`
      CREATE TABLE "sale_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "unit_sale_id" uuid NOT NULL,
        "document_type_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "storage_key" varchar(500) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "size_bytes" int NOT NULL DEFAULT 0,
        "status" varchar(12) NOT NULL DEFAULT 'PENDING',
        "expiration_date" date,
        "rejection_reason" varchar(500),
        "validated_at" TIMESTAMP,
        "validated_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_documents" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sd_status" CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
        CONSTRAINT "FK_sd_sale" FOREIGN KEY ("unit_sale_id")
          REFERENCES "unit_sales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sd_type" FOREIGN KEY ("document_type_id")
          REFERENCES "sale_document_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sd_validator" FOREIGN KEY ("validated_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )`);
    await q.query(
      `CREATE INDEX "IDX_sd_sale" ON "sale_documents" ("unit_sale_id")`,
    );

    // ── Semilla: catálogo y matriz de fábrica por tenant ──
    // Se siembra para cada tenant existente el set estándar mexicano, para que
    // un cliente nuevo opere desde el primer día y pueda ajustarlo después.
    // `tenant_id NULL` no se usa aquí —a diferencia de las fotos de recepción—
    // porque estas reglas se editan por tenant y conviene que sean suyas.
    await q.query(`
      DO $$
      DECLARE
        t RECORD;
        v_ine uuid; v_domicilio uuid; v_rfc uuid; v_ingresos uuid;
        v_acta uuid; v_poder uuid; v_contrato uuid;
      BEGIN
        FOR t IN SELECT id FROM tenants LOOP
          -- Catálogo
          INSERT INTO sale_document_types (tenant_id, key, name, scope, has_expiration, sort_order)
          VALUES
            (t.id, 'INE',        'Identificación oficial (INE/pasaporte)', 'CLIENT', true,  10),
            (t.id, 'DOMICILIO',  'Comprobante de domicilio',               'CLIENT', true,  20),
            (t.id, 'RFC',        'Constancia de situación fiscal',         'CLIENT', false, 30),
            (t.id, 'INGRESOS',   'Comprobante de ingresos',                'SALE',   true,  40),
            (t.id, 'ACTA',       'Acta constitutiva',                      'CLIENT', false, 50),
            (t.id, 'PODER',      'Poder del representante legal',          'CLIENT', false, 60),
            (t.id, 'CONTRATO',   'Contrato de compraventa firmado',        'SALE',   false, 70),
            (t.id, 'FACTURA',    'Factura de la unidad',                   'SALE',   false, 80);

          SELECT id INTO v_ine       FROM sale_document_types WHERE tenant_id=t.id AND key='INE';
          SELECT id INTO v_domicilio FROM sale_document_types WHERE tenant_id=t.id AND key='DOMICILIO';
          SELECT id INTO v_rfc       FROM sale_document_types WHERE tenant_id=t.id AND key='RFC';
          SELECT id INTO v_ingresos  FROM sale_document_types WHERE tenant_id=t.id AND key='INGRESOS';
          SELECT id INTO v_acta      FROM sale_document_types WHERE tenant_id=t.id AND key='ACTA';
          SELECT id INTO v_poder     FROM sale_document_types WHERE tenant_id=t.id AND key='PODER';
          SELECT id INTO v_contrato  FROM sale_document_types WHERE tenant_id=t.id AND key='CONTRATO';

          -- Matriz de fábrica. NULL en un eje = aplica a cualquiera.
          INSERT INTO sale_document_rules (tenant_id, document_type_id, client_type, financing_type, vehicle_type, is_required)
          VALUES
            -- Siempre, a quien sea y como sea:
            (t.id, v_ine,       NULL,        NULL,          NULL, true),
            (t.id, v_domicilio, NULL,        NULL,          NULL, true),
            (t.id, v_rfc,       NULL,        NULL,          NULL, true),
            (t.id, v_contrato,  NULL,        NULL,          NULL, true),
            -- A crédito (cualquiera de los dos), comprobante de ingresos:
            (t.id, v_ingresos,  NULL,        'BANK_CREDIT', NULL, true),
            (t.id, v_ingresos,  NULL,        'AGENCY_CREDIT', NULL, true),
            -- Persona moral, acta y poder:
            (t.id, v_acta,      'BUSINESS',  NULL,          NULL, true),
            (t.id, v_poder,     'BUSINESS',  NULL,          NULL, true);
        END LOOP;
      END $$;`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "sale_documents"`);
    await q.query(`DROP TABLE "sale_document_rules"`);
    await q.query(`DROP TABLE "sale_document_types"`);
  }
}
