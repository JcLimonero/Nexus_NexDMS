-- =====================================================================
-- Taller Demo — Phase 3: Ventas de unidades + PLD.
--
-- Inventario de unidades en piso (a partir de los modelos globales que YA
-- existan, para no depender de modelos específicos), 2 ventas (contado y
-- crédito) y la operación PLD de la venta de contado. INSERT-only y scoped
-- a taller-demo (re-ejecutable). Requiere seed-taller-demo.sql previo.
--
-- Recepción, Seminuevos y CFDI quedan fuera (recepción = checklists/fotos;
-- CFDI = timbrado real).
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS matriz,
  (SELECT id FROM users WHERE tenant_id = t.id AND email = 'carlos.limon@nexusqtech.com' LIMIT 1) AS admin,
  (now() AT TIME ZONE 'America/Mexico_City')::date AS hoy
FROM tenants t WHERE t.slug = 'taller-demo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe taller-demo. Corre primero seed-taller-demo.sql.';
  END IF;
END $$;

-- ── Limpieza scoped (re-ejecutable) ──────────────────────────────────
DELETE FROM pld_operations       WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM unit_sale_accessories WHERE unit_sale_id IN (SELECT id FROM unit_sales WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM unit_sales           WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM catalog_units        WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── Auxiliares ───────────────────────────────────────────────────────
CREATE TEMP TABLE t_cli AS
  SELECT row_number() OVER (ORDER BY created_at) rn, id
  FROM clients WHERE tenant_id = (SELECT tenant_id FROM ref);

-- Asegura la marca Honda y modelos de AUTO en el catálogo GLOBAL (compartido),
-- para que el piso sean autos y no motos. Aditivo e idempotente. Reusa un
-- vehicle_type_id existente (el tipo es cosmético para el demo).
INSERT INTO global_brands (id, name, is_active)
SELECT gen_random_uuid(), 'Honda', true
WHERE NOT EXISTS (SELECT 1 FROM global_brands WHERE name = 'Honda');

INSERT INTO global_models (id, brand_id, vehicle_type_id, model, version, year, is_active)
SELECT gen_random_uuid(),
       (SELECT id FROM global_brands WHERE name = 'Honda' LIMIT 1),
       (SELECT vehicle_type_id FROM global_models WHERE vehicle_type_id IS NOT NULL LIMIT 1),
       m.model, 'Base', 2024, true
FROM (VALUES ('Civic'), ('CR-V'), ('HR-V'), ('City'), ('Accord'), ('BR-V')) AS m(model)
WHERE NOT EXISTS (
  SELECT 1 FROM global_models gm2
  JOIN global_brands gb2 ON gb2.id = gm2.brand_id
  WHERE gb2.name = 'Honda' AND gm2.model = m.model
);

-- 6 modelos de auto Honda para el piso.
CREATE TEMP TABLE t_gm AS
  SELECT row_number() OVER (ORDER BY gm.model) rn, gm.id AS gm_id, gb.name AS marca, gm.model AS modelo
  FROM global_models gm
  JOIN global_brands gb ON gb.id = gm.brand_id
  WHERE gb.name = 'Honda' AND gm.model IN ('Civic','CR-V','HR-V','City','Accord','BR-V')
  LIMIT 6;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM t_gm) THEN
    RAISE EXCEPTION 'No hay modelos en global_models; no se pueden sembrar unidades en piso.';
  END IF;
END $$;

-- ── Unidades en piso ─────────────────────────────────────────────────
INSERT INTO catalog_units (id, tenant_id, branch_id, global_model_id, vehicle_type,
                           brand, model, year, color, serial_number, engine_number,
                           cost_price, list_price, sale_price, status, condition_type,
                           acquisition_date)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       g.gm_id, 'CAR', g.marca, g.modelo, 2024,
       (ARRAY['Blanco','Negro','Gris','Rojo','Azul','Plata'])[g.rn::int],
       'TDM-SN-' || lpad(g.rn::text, 4, '0'),
       'TDM-MOT-' || lpad(g.rn::text, 4, '0'),
       (180000 + g.rn * 20000), (220000 + g.rn * 25000), (220000 + g.rn * 25000),
       (ARRAY['AVAILABLE','AVAILABLE','AVAILABLE','RESERVED','SOLD','SOLD'])[g.rn::int]::catalog_units_status_enum,
       'NEW'::catalog_units_condition_type_enum,
       (SELECT hoy FROM ref) - (g.rn * 10)::int
FROM t_gm g;

-- ── Ventas de unidades (sobre las marcadas SOLD) ─────────────────────
CREATE TEMP TABLE t_unit AS
  SELECT row_number() OVER (ORDER BY serial_number) rn, id, list_price, sale_price
  FROM catalog_units
  WHERE tenant_id = (SELECT tenant_id FROM ref) AND status = 'SOLD';

INSERT INTO unit_sales (id, tenant_id, catalog_unit_id, client_id, user_id, folio,
                        list_price, final_price, down_payment, financing_type,
                        bank_financier, status, delivery_date, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), u.id, cl.id, (SELECT admin FROM ref),
       'VU-2026-' || lpad(u.rn::text, 4, '0'),
       u.list_price, u.sale_price,
       CASE WHEN u.rn = 1 THEN 40000 ELSE 0 END,
       (ARRAY['BANK_CREDIT','CASH'])[u.rn::int]::unit_sales_financing_type_enum,
       CASE WHEN u.rn = 1 THEN 'BBVA' ELSE NULL END,
       'COMPLETED',
       (SELECT hoy FROM ref) - (u.rn * 15)::int, 'Venta de demostración'
FROM t_unit u
JOIN t_cli cl ON cl.rn = ((u.rn - 1) % (SELECT max(rn) FROM t_cli)) + 1
WHERE u.rn <= 2;

-- ── PLD: la venta de contado rebasa umbral, exige identificación ─────
INSERT INTO pld_operations (id, tenant_id, branch_id, client_id, reference_type, reference_id,
                            amount, uma_value, uma_amount, operation_date,
                            requires_identification, requires_notice, file_status, notice_status, notes)
SELECT gen_random_uuid(), us.tenant_id, (SELECT matriz FROM ref), us.client_id, 'UnitSale', us.id,
       us.final_price, 113.14, round(us.final_price / 113.14, 2), us.delivery_date,
       true, false, 'COMPLETO', 'NO_APLICA', 'Venta de contado; expediente integrado'
FROM unit_sales us
WHERE us.tenant_id = (SELECT tenant_id FROM ref) AND us.financing_type = 'CASH';

COMMIT;

SELECT
  (SELECT count(*) FROM catalog_units WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS unidades_piso,
  (SELECT count(*) FROM unit_sales    WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS ventas_unidades,
  (SELECT count(*) FROM pld_operations WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS operaciones_pld;
