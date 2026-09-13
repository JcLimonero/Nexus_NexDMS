-- =====================================================================
-- Taller Demo — Phase 5: cobertura de los módulos que faltaban.
--
-- Deja a Taller Demo con datos en TODOS los módulos operables:
--   · Contactos de clientes
--   · Flotillas (convenio + unidades)
--   · Hojalatería y Pintura (catálogo de piezas + órdenes con renglones)
--   · Almacén (2ª sucursal + traspaso entre sucursales con renglones)
--   · Expediente documental de ventas (tipos + reglas + documentos)
--   · Plan de pagos de la venta a crédito (unit_sale_payments)
--
-- INSERT-only, scoped a taller-demo, re-ejecutable. Requiere las fases 1-4.
-- Fuera de alcance: CFDI (timbrado real con FacturAPI) y Facturación SaaS
-- (suscripción NexDMS, no es dato del negocio del tenant).
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS matriz,
  (SELECT legal_entity_id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS legal_entity,
  (SELECT id FROM users WHERE tenant_id = t.id AND email = 'carlos.limon@nexusqtech.com' LIMIT 1) AS admin,
  (now() AT TIME ZONE 'America/Mexico_City')::date AS hoy
FROM tenants t WHERE t.slug = 'taller-demo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe taller-demo. Corre primero seed-taller-demo.sql.';
  END IF;
END $$;

-- Cliente "flotilla": el que más vehículos tiene (para que el convenio tenga unidades).
CREATE TEMP TABLE fleet_client AS
  SELECT c.id AS client_id
  FROM clients c
  JOIN customer_vehicles v ON v.owner_id = c.id
  WHERE c.tenant_id = (SELECT tenant_id FROM ref)
  GROUP BY c.id
  ORDER BY count(v.id) DESC
  LIMIT 1;

-- ── Limpieza scoped (re-ejecutable) ──────────────────────────────────
DELETE FROM warehouse_transfer_items WHERE warehouse_transfer_id IN
  (SELECT id FROM warehouse_transfers WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM warehouse_transfers WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM sale_documents      WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM sale_document_rules WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM sale_document_types WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM bodywork_items  WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM bodywork_orders WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM bodywork_parts  WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM fleet_units      WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM fleet_agreements WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM contacts         WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM unit_sale_payments WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── 1. Contactos ─────────────────────────────────────────────────────
INSERT INTO contacts (tenant_id, client_id, first_name, last_name, phone, email, position, is_authorized)
SELECT (SELECT tenant_id FROM ref), (SELECT client_id FROM fleet_client),
       v.fn, v.ln, v.tel, v.mail, v.pos, true
FROM (VALUES
  ('María',   'Hernández', '7717100201', 'maria.h@flotilla.mx',  'Encargada de flotilla'),
  ('Roberto', 'Cházaro',   '7717100202', 'roberto.c@flotilla.mx','Autoriza órdenes')
) AS v(fn, ln, tel, mail, pos);

-- ── 2. Flotillas: convenio + unidades del cliente ────────────────────
INSERT INTO fleet_agreements (id, tenant_id, client_id, agreement_number, name,
                              parts_discount_pct, labor_discount_pct, unit_sale_discount_pct,
                              valid_from, valid_to, is_active, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT client_id FROM fleet_client),
       'FLT-2026-0001', 'Convenio Flotilla Corporativa',
       12.0, 10.0, 3.0,
       (SELECT hoy FROM ref) - 60, (SELECT hoy FROM ref) + 305, true,
       'Precios preferenciales en refacciones, mano de obra y venta de unidades.';

INSERT INTO fleet_units (id, tenant_id, fleet_agreement_id, vehicle_id)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref),
       (SELECT id FROM fleet_agreements WHERE tenant_id = (SELECT tenant_id FROM ref) LIMIT 1),
       v.id
FROM customer_vehicles v
WHERE v.tenant_id = (SELECT tenant_id FROM ref)
  AND v.owner_id = (SELECT client_id FROM fleet_client);

-- ── 3. Hojalatería y Pintura ─────────────────────────────────────────
-- Catálogo de piezas por zona.
INSERT INTO bodywork_parts (id, tenant_id, code, name, zone, default_price, is_active, sort_order)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), p.code, p.name, p.zone, p.price, true, p.ord
FROM (VALUES
  ('HP-COF', 'Cofre',              'FRENTE',      3800, 1),
  ('HP-DEF', 'Defensa delantera',  'FRENTE',      2600, 2),
  ('HP-PLI', 'Puerta lateral izq.','LATERAL_IZQ', 3200, 3),
  ('HP-PLD', 'Puerta lateral der.','LATERAL_DER', 3200, 4),
  ('HP-TAP', 'Tapa de cajuela',    'TRASERA',     2900, 5),
  ('HP-TEC', 'Toldo/techo',        'TECHO',       4200, 6)
) AS p(code, name, zone, price, ord);

-- 2 órdenes: una por aseguradora, una particular. Reusan cliente/vehículo reales.
CREATE TEMP TABLE bw_veh AS
  SELECT row_number() OVER (ORDER BY v.created_at) rn, v.id AS vehicle_id, v.owner_id,
         v.make, v.model, v.year, v.color, v.plate, v.vin
  FROM customer_vehicles v
  WHERE v.tenant_id = (SELECT tenant_id FROM ref)
  LIMIT 2;

INSERT INTO bodywork_orders (id, tenant_id, branch_id, folio, status, client_id, client_name,
                             client_phone, vehicle_plate, vehicle_brand, vehicle_model, vehicle_year,
                             vehicle_color, vehicle_vin, payment_type, insurance_company, policy_number,
                             claim_number, deductible, adjuster, claim_date, km_in, fuel_level,
                             damage_description, labor_total, material_total, parts_total, total,
                             received_at, delivered_at, assigned_to)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       'HP-2026-' || lpad(b.rn::text, 4, '0'),
       (ARRAY['DELIVERED','IN_PROGRESS'])[b.rn::int],
       cl.id, coalesce(nullif(trim(concat_ws(' ', cl.first_name, cl.last_name)), ''), cl.company_name, 'Cliente'),
       cl.phone, b.plate, b.make, b.model, b.year, b.color, b.vin,
       (ARRAY['INSURANCE','PARTICULAR'])[b.rn::int],
       CASE WHEN b.rn = 1 THEN 'Quálitas' ELSE NULL END,
       CASE WHEN b.rn = 1 THEN 'POL-99120' ELSE NULL END,
       CASE WHEN b.rn = 1 THEN 'SIN-2026-4471' ELSE NULL END,
       CASE WHEN b.rn = 1 THEN 6000 ELSE NULL END,
       CASE WHEN b.rn = 1 THEN 'J. Robledo (ajustador)' ELSE NULL END,
       CASE WHEN b.rn = 1 THEN (SELECT hoy FROM ref) - 20 ELSE NULL END,
       (45000 + b.rn * 1000), 'Medio',
       CASE WHEN b.rn = 1 THEN 'Colisión lateral derecha; puerta y salpicadera con abolladura.'
            ELSE 'Rayón profundo en cofre y defensa delantera.' END,
       0, 0, 0, 0,
       (SELECT hoy FROM ref) - (25 - b.rn * 5)::int,
       CASE WHEN b.rn = 1 THEN (SELECT hoy FROM ref) - 5 ELSE NULL END,
       (SELECT admin FROM ref)
FROM bw_veh b
JOIN clients cl ON cl.id = b.owner_id;

-- Renglones de cada orden (piezas del catálogo, operación y precios).
INSERT INTO bodywork_items (id, tenant_id, order_id, bodywork_part_id, part_name, operation,
                            quantity, labor_price, material_price, part_price, subtotal, status, sort_order)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), o.id, bp.id, bp.name, x.op,
       1, x.labor, x.material, x.part, (x.labor + x.material + x.part), 'APPROVED', x.ord
FROM bodywork_orders o
JOIN LATERAL (VALUES
  ('HP-PLD', 'REPLACE', 1200, 400, 3200, 1),
  ('HP-COF', 'REPAIR',  1500, 600, 0,    2),
  ('HP-DEF', 'PAINT',   900,  700, 0,    3)
) AS x(code, op, labor, material, part, ord) ON true
JOIN bodywork_parts bp ON bp.code = x.code AND bp.tenant_id = (SELECT tenant_id FROM ref)
WHERE o.tenant_id = (SELECT tenant_id FROM ref);

-- Recalcula totales de cada orden a partir de sus renglones.
UPDATE bodywork_orders o SET
  labor_total    = t.labor,
  material_total = t.material,
  parts_total    = t.part,
  total          = t.labor + t.material + t.part
FROM (
  SELECT order_id, sum(labor_price) labor, sum(material_price) material, sum(part_price) part
  FROM bodywork_items WHERE tenant_id = (SELECT tenant_id FROM ref) GROUP BY order_id
) t
WHERE o.id = t.order_id;

-- ── 4. Almacén: 2ª sucursal + traspaso entre sucursales ──────────────
INSERT INTO branches (id, tenant_id, name, slug, address, city, state, counter_phone, email,
                      horario, is_primary, is_active, legal_entity_id)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), 'Sucursal Norte', 'norte',
       'Av. Universidad 500, Col. Nueva', 'Pachuca', 'Hidalgo', '771 765 4321',
       'norte@tallerdemo.mx', '{}'::jsonb, false, true, (SELECT legal_entity FROM ref)
WHERE NOT EXISTS (
  SELECT 1 FROM branches WHERE tenant_id = (SELECT tenant_id FROM ref) AND slug = 'norte'
);

INSERT INTO warehouse_transfers (id, tenant_id, origin_branch_id, destination_branch_id, approver_id,
                                 folio, type, status, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref),
       (SELECT matriz FROM ref),
       (SELECT id FROM branches WHERE tenant_id = (SELECT tenant_id FROM ref) AND slug = 'norte' LIMIT 1),
       (SELECT admin FROM ref),
       'TR-2026-0001', 'INTRA_BRAND'::warehouse_transfers_type_enum,
       'RECEIVED'::warehouse_transfers_status_enum,
       'Traspaso de refacciones de Matriz a Sucursal Norte.';

INSERT INTO warehouse_transfer_items (id, warehouse_transfer_id, part_id, quantity)
SELECT gen_random_uuid(),
       (SELECT id FROM warehouse_transfers WHERE tenant_id = (SELECT tenant_id FROM ref) LIMIT 1),
       p.id, (2 + p.rn)
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at) rn
  FROM parts WHERE tenant_id = (SELECT tenant_id FROM ref) LIMIT 3
) p;

-- ── 5. Expediente documental de ventas ───────────────────────────────
INSERT INTO sale_document_types (id, tenant_id, key, name, scope, has_expiration, sort_order, is_active)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), d.key, d.name, 'SALE', d.exp, d.ord, true
FROM (VALUES
  ('INE',        'Identificación oficial (INE)', false, 1),
  ('COMP_DOM',   'Comprobante de domicilio',     true,  2),
  ('CONTRATO',   'Contrato de compraventa',      false, 3),
  ('FACTURA',    'Factura de la unidad',         false, 4)
) AS d(key, name, exp, ord);

-- Todos requeridos para cualquier venta.
INSERT INTO sale_document_rules (id, tenant_id, document_type_id, is_required)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), dt.id, true
FROM sale_document_types dt WHERE dt.tenant_id = (SELECT tenant_id FROM ref);

-- Documentos ya cargados en las ventas existentes (marcados validados).
-- NOTA: el archivo físico no existe en el storage; es solo el registro para
-- que el expediente aparezca completo en el detalle de la venta (demo).
INSERT INTO sale_documents (id, tenant_id, unit_sale_id, document_type_id, name, storage_key,
                            mime_type, size_bytes, status, validated_at, validated_by)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), us.id, dt.id,
       dt.name || '.pdf',
       'demo/sale-docs/' || us.id || '/' || dt.key || '.pdf',
       'application/pdf', 102400, 'APPROVED',
       (SELECT hoy FROM ref), (SELECT admin FROM ref)
FROM unit_sales us
CROSS JOIN sale_document_types dt
WHERE us.tenant_id = (SELECT tenant_id FROM ref)
  AND dt.tenant_id = (SELECT tenant_id FROM ref)
  AND dt.key IN ('INE', 'CONTRATO', 'FACTURA');

-- ── 6. Plan de pagos de la venta a crédito ───────────────────────────
INSERT INTO unit_sale_payments (id, tenant_id, unit_sale_id, kind, amount, method, reference, paid_date, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), us.id, p.kind, p.amount, p.method, p.ref,
       (SELECT hoy FROM ref) - p.days, p.note
FROM unit_sales us
JOIN LATERAL (VALUES
  ('ENGANCHE', 40000.0, 'TRANSFER', 'SPEI-778001', 45, 'Enganche'),
  ('PARCIAL',  8500.0,  'TRANSFER', 'SPEI-778002', 15, 'Mensualidad 1'),
  ('PARCIAL',  8500.0,  'CASH',     NULL,          0,  'Mensualidad 2')
) AS p(kind, amount, method, ref, days, note) ON true
WHERE us.tenant_id = (SELECT tenant_id FROM ref) AND us.financing_type = 'BANK_CREDIT';

COMMIT;

-- ── Verificación ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM contacts          WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS contactos,
  (SELECT count(*) FROM fleet_agreements  WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS convenios,
  (SELECT count(*) FROM fleet_units       WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS unidades_flotilla,
  (SELECT count(*) FROM bodywork_orders   WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS ordenes_hp,
  (SELECT count(*) FROM bodywork_items    WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS renglones_hp,
  (SELECT count(*) FROM branches          WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS sucursales,
  (SELECT count(*) FROM warehouse_transfers WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS traspasos,
  (SELECT count(*) FROM sale_document_types WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS tipos_doc,
  (SELECT count(*) FROM sale_documents    WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS docs_venta,
  (SELECT count(*) FROM unit_sale_payments WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS pagos_venta;
