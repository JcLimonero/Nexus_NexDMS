-- =====================================================================
-- Taller Demo — Phase 9: más órdenes de Hojalatería y Pintura.
--
-- Agrega 16 órdenes de carrocería repartidas en todos los estados (para que el
-- tablero Kanban de hojalatería tenga contenido), con renglones (piezas del
-- catálogo) y totales calculados. Reusa clientes/vehículos reales.
--
-- Folios 'HP-2026-1xxx' como marca del lote (no chocan con los de la fase 5).
-- INSERT-only, re-ejecutable (borra su propio lote). Requiere las fases 1 y 5.
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

-- Limpia el lote propio (re-ejecutable).
DELETE FROM bodywork_items WHERE tenant_id = (SELECT tenant_id FROM ref)
  AND order_id IN (SELECT id FROM bodywork_orders WHERE tenant_id = (SELECT tenant_id FROM ref) AND folio LIKE 'HP-%-1%');
DELETE FROM bodywork_orders WHERE tenant_id = (SELECT tenant_id FROM ref) AND folio LIKE 'HP-%-1%';

-- Asegura catálogo de piezas (por si la fase 5 no corrió).
INSERT INTO bodywork_parts (id, tenant_id, code, name, zone, default_price, is_active, sort_order)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), p.code, p.name, p.zone, p.price, true, p.ord
FROM (VALUES
  ('HP-COF', 'Cofre',              'FRENTE',      3800, 1),
  ('HP-DEF', 'Defensa delantera',  'FRENTE',      2600, 2),
  ('HP-PLI', 'Puerta lateral izq.','LATERAL_IZQ', 3200, 3),
  ('HP-PLD', 'Puerta lateral der.','LATERAL_DER', 3200, 4),
  ('HP-TAP', 'Tapa de cajuela',    'TRASERA',     2900, 5),
  ('HP-TEC', 'Toldo/techo',        'TECHO',       4200, 6)
) AS p(code, name, zone, price, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM bodywork_parts bp WHERE bp.tenant_id = (SELECT tenant_id FROM ref) AND bp.code = p.code
);

-- 16 unidades al azar para las órdenes.
CREATE TEMP TABLE bw AS
  SELECT (row_number() OVER (ORDER BY random()))::int rn,
         cv.id AS vehicle_id, cv.owner_id,
         cv.make, cv.model, cv.year, cv.color, cv.plate, cv.vin, cv.mileage
  FROM customer_vehicles cv
  WHERE cv.tenant_id = (SELECT tenant_id FROM ref)
  ORDER BY random() LIMIT 16;

INSERT INTO bodywork_orders (id, tenant_id, branch_id, folio, status, client_id, client_name,
                             client_phone, vehicle_plate, vehicle_brand, vehicle_model, vehicle_year,
                             vehicle_color, vehicle_vin, payment_type, insurance_company, policy_number,
                             claim_number, deductible, adjuster, claim_date, km_in, fuel_level,
                             damage_description, labor_total, material_total, parts_total, total,
                             received_at, delivered_at, assigned_to)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       'HP-2026-' || lpad((1000 + b.rn)::text, 4, '0'),
       st.status,
       cl.id, coalesce(nullif(trim(concat_ws(' ', cl.first_name, cl.last_name)), ''), cl.company_name, 'Cliente'),
       cl.phone, b.plate, b.make, b.model, b.year, b.color, b.vin,
       st.pago,
       CASE WHEN st.pago = 'INSURANCE' THEN (ARRAY['Quálitas','GNP','AXA','HDI'])[1 + (b.rn % 4)] END,
       CASE WHEN st.pago = 'INSURANCE' THEN 'POL-' || (10000 + b.rn)::text END,
       CASE WHEN st.pago = 'INSURANCE' THEN 'SIN-2026-' || (4000 + b.rn)::text END,
       CASE WHEN st.pago = 'INSURANCE' THEN 6000 END,
       CASE WHEN st.pago = 'INSURANCE' THEN 'Ajustador asignado' END,
       CASE WHEN st.pago = 'INSURANCE' THEN st.rec::date END,
       b.mileage, (ARRAY['Bajo','Medio','Alto'])[1 + (b.rn % 3)],
       (ARRAY['Colisión lateral; puerta y salpicadera con abolladura.',
              'Rayón profundo en cofre y defensa.',
              'Golpe en cajuela; requiere enderezado y pintura.',
              'Daño en toldo por granizo.'])[1 + (b.rn % 4)],
       0, 0, 0, 0,
       st.rec,
       CASE WHEN st.status = 'DELIVERED' THEN st.rec + interval '6 days' END,
       (SELECT admin FROM ref)
FROM bw b
JOIN clients cl ON cl.id = b.owner_id
JOIN LATERAL (
  SELECT (ARRAY['RECEIVED','IN_PROGRESS','READY','DELIVERED','CANCELLED'])[1 + (b.rn % 5)] AS status,
         CASE WHEN b.rn % 2 = 0 THEN 'INSURANCE' ELSE 'PARTICULAR' END AS pago,
         (((SELECT hoy FROM ref) - (b.rn % 25))::timestamp + time '10:00') AS rec
) st ON true;

-- Renglones: 3 piezas por orden (reparar / cambiar / pintar).
INSERT INTO bodywork_items (id, tenant_id, order_id, bodywork_part_id, part_name, operation,
                            quantity, labor_price, material_price, part_price, subtotal, status, sort_order)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), o.id, bp.id, bp.name, x.op,
       1, x.labor, x.material, x.part, (x.labor + x.material + x.part),
       CASE WHEN o.status = 'RECEIVED' THEN 'PENDING' ELSE 'APPROVED' END, x.ord
FROM bodywork_orders o
JOIN LATERAL (VALUES
  ('HP-PLD', 'REPLACE', 1200, 400, 3200, 1),
  ('HP-COF', 'REPAIR',  1500, 600, 0,    2),
  ('HP-DEF', 'PAINT',   900,  700, 0,    3)
) AS x(code, op, labor, material, part, ord) ON true
JOIN bodywork_parts bp ON bp.code = x.code AND bp.tenant_id = (SELECT tenant_id FROM ref)
WHERE o.tenant_id = (SELECT tenant_id FROM ref) AND o.folio LIKE 'HP-%-1%';

-- Totales por orden.
UPDATE bodywork_orders o SET
  labor_total    = t.labor,
  material_total = t.material,
  parts_total    = t.part,
  total          = t.labor + t.material + t.part
FROM (
  SELECT order_id, sum(labor_price) labor, sum(material_price) material, sum(part_price) part
  FROM bodywork_items WHERE tenant_id = (SELECT tenant_id FROM ref) GROUP BY order_id
) t
WHERE o.id = t.order_id AND o.folio LIKE 'HP-%-1%';

COMMIT;

-- ── Verificación ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM bodywork_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo')) AS ordenes_hp_total,
  (SELECT string_agg(status || ':' || n, '  ') FROM (
     SELECT status, count(*)::int n FROM bodywork_orders
     WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') GROUP BY status ORDER BY status
  ) s) AS por_estado,
  (SELECT count(*) FROM bodywork_items WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo')) AS renglones;
