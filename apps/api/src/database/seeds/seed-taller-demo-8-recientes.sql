-- =====================================================================
-- Taller Demo — Phase 8: actividad reciente del taller.
--
-- Agrega ~22 órdenes de servicio recientes (últimos ~30 días) en estados
-- ACTIVOS (recibida, diagnóstico, en proceso, esperando refacciones, lista),
-- una por unidad distinta, para que el tablero/dashboard de Taller se vea con
-- movimiento sin romper la coherencia del histórico:
--   · km_in continúa la progresión de la unidad (último servicio + 10k).
--   · el nombre del servicio cuadra con ese km (o es una reparación puntual).
--
-- Solo INSERT. Folios en rango 9xxxx para no chocar con los históricos.
-- Re-ejecutable: borra su propio lote (folios 9xxxx) antes de reinsertar.
-- Requiere las fases 1, 6 y 7.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS matriz,
  (now() AT TIME ZONE 'America/Mexico_City')::date AS hoy
FROM tenants t WHERE t.slug = 'taller-demo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe taller-demo. Corre primero seed-taller-demo.sql.';
  END IF;
END $$;

-- Limpia el lote propio (re-ejecutable).
DELETE FROM service_order_parts WHERE service_order_id IN (
  SELECT id FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref) AND folio LIKE 'TDM-%-9%');
DELETE FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref) AND folio LIKE 'TDM-%-9%';

-- Asesores (recepción) y mecánicos, numerados para repartir.
CREATE TEMP TABLE t_adv AS
  SELECT row_number() OVER (ORDER BY u.email) rn, u.id
  FROM users u JOIN user_roles r ON r.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND r.role = 'RECEPTIONIST';
CREATE TEMP TABLE t_mech AS
  SELECT row_number() OVER (ORDER BY u.email) rn, u.id
  FROM users u JOIN user_roles r ON r.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND r.role = 'MECHANIC';

-- 22 unidades al azar, con su último km conocido.
CREATE TEMP TABLE picks AS
  SELECT (row_number() OVER (ORDER BY random()))::int AS rn,
         cv.id AS vehicle_id, cv.owner_id,
         COALESCE((SELECT max(km_in) FROM service_orders s WHERE s.vehicle_id = cv.id), 10000) AS lastkm
  FROM customer_vehicles cv
  WHERE cv.tenant_id = (SELECT tenant_id FROM ref)
  ORDER BY random() LIMIT 22;

INSERT INTO service_orders (id, tenant_id, branch_id, owner_id, vehicle_id, user_id, mechanic_id,
                            folio, status, reported_fault, diagnosis, km_in,
                            labor_cost, parts_cost, discount, total,
                            received_at, promised_at, delivered_at, tracking_token)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       p.owner_id, p.vehicle_id,
       a.id,
       CASE WHEN st.status = 'RECEIVED' THEN NULL ELSE m.id END,
       'TDM-' || to_char(st.rec, 'YYYY') || '-' || lpad((90000 + p.rn)::text, 5, '0'),
       st.status::service_orders_status_enum,
       CASE WHEN p.rn % 3 = 0
            THEN (ARRAY['Ruido en frenos al frenar',
                        'Falla eléctrica intermitente',
                        'Revisión de suspensión',
                        'Aire acondicionado no enfría'])[1 + (p.rn % 4)]
            ELSE 'Servicio de ' || to_char(p.lastkm + 10000, 'FM999,999') || ' km' END,
       CASE WHEN st.status IN ('DIAGNOSIS','RECEIVED') THEN NULL
            ELSE 'En proceso en taller' END,
       CASE WHEN p.rn % 3 = 0 THEN p.lastkm ELSE p.lastkm + 10000 END,
       st.labor, st.parts, 0, round((st.labor + st.parts) * 1.16, 2),
       st.rec, st.rec + interval '1 day' + interval '4 hours',
       NULL,
       gen_random_uuid()
FROM (
  SELECT p.*,
    (ARRAY['RECEIVED','DIAGNOSIS','IN_PROGRESS','WAITING_PARTS','READY'])[1 + (p.rn % 5)] AS status,
    (((SELECT hoy FROM ref) - (p.rn % 28))::timestamp + time '09:00' + ((p.rn % 6) || ' hours')::interval) AS rec,
    (500 + (p.rn % 6) * 150)::numeric AS labor,
    (300 + (p.rn % 8) * 200)::numeric AS parts
  FROM picks p
) st
JOIN picks p ON p.rn = st.rn
JOIN t_adv  a ON a.rn = ((st.rn - 1) % (SELECT max(rn) FROM t_adv))  + 1
JOIN t_mech m ON m.rn = ((st.rn - 1) % (SELECT max(rn) FROM t_mech)) + 1;

COMMIT;

-- ── Verificación ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') AND folio LIKE 'TDM-%-9%') AS lote_reciente,
  (SELECT count(*) FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') AND status <> 'DELIVERED') AS activas_total,
  (SELECT count(*) FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo')) AS ordenes_total;
