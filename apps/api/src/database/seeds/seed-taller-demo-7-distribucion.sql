-- =====================================================================
-- Taller Demo — Phase 7: reparto realista de vehículos por cliente.
--
-- La fase 6 dejó 1 vehículo por cliente. Aquí se redistribuyen los vehículos
-- entre un subconjunto de clientes con cantidades ALEATORIAS (unos con 1, otros
-- con 3-5), para que varios clientes tengan varias unidades y servicios.
--
-- Propaga el nuevo dueño a las órdenes de servicio y a las citas (que llevan el
-- dueño denormalizado), y refresca el convenio de flotilla al cliente con más
-- unidades. Solo UPDATE/DELETE/INSERT sobre relaciones existentes: no borra
-- órdenes. Re-ejecutable (reordena). Requiere las fases 1 y 6.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id
FROM tenants t WHERE t.slug = 'taller-demo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe taller-demo. Corre primero seed-taller-demo.sql.';
  END IF;
END $$;

-- Subconjunto de clientes que serán "dueños de unidades" (los demás quedan como
-- prospectos/contactos sin vehículo, lo cual es realista).
CREATE TEMP TABLE pool AS
  SELECT id FROM clients
  WHERE tenant_id = (SELECT tenant_id FROM ref) AND deleted_at IS NULL
  ORDER BY random() LIMIT 40;

-- Cada vehículo toma un dueño al azar del pool (evaluación por fila).
CREATE TEMP TABLE asignacion AS
  SELECT v.id AS vehicle_id, c.id AS client_id
  FROM customer_vehicles v
  JOIN LATERAL (
    SELECT p.id FROM pool p ORDER BY md5(v.id::text || random()::text) LIMIT 1
  ) c ON true
  WHERE v.tenant_id = (SELECT tenant_id FROM ref);

-- ── Reasignar dueño de cada vehículo ─────────────────────────────────
UPDATE customer_vehicles cv
SET owner_id = a.client_id
FROM asignacion a
WHERE cv.id = a.vehicle_id;

-- ── Propagar el dueño a las órdenes de servicio ──────────────────────
UPDATE service_orders so
SET owner_id = cv.owner_id
FROM customer_vehicles cv
WHERE so.vehicle_id = cv.id AND so.tenant_id = (SELECT tenant_id FROM ref);

-- ── Propagar el dueño a las citas ────────────────────────────────────
UPDATE appointments ap
SET client_id    = cv.owner_id,
    client_name  = coalesce(nullif(trim(concat_ws(' ', cl.first_name, cl.last_name)), ''), cl.company_name, 'Cliente'),
    client_phone = cl.phone
FROM customer_vehicles cv
JOIN clients cl ON cl.id = cv.owner_id
WHERE ap.vehicle_id = cv.id AND ap.tenant_id = (SELECT tenant_id FROM ref);

-- ── Refrescar la flotilla al cliente con más unidades ────────────────
CREATE TEMP TABLE topcli AS
  SELECT owner_id, count(*) n
  FROM customer_vehicles WHERE tenant_id = (SELECT tenant_id FROM ref)
  GROUP BY owner_id ORDER BY n DESC LIMIT 1;

UPDATE fleet_agreements
SET client_id = (SELECT owner_id FROM topcli)
WHERE tenant_id = (SELECT tenant_id FROM ref);

DELETE FROM fleet_units WHERE tenant_id = (SELECT tenant_id FROM ref);
INSERT INTO fleet_units (id, tenant_id, fleet_agreement_id, vehicle_id)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref),
       (SELECT id FROM fleet_agreements WHERE tenant_id = (SELECT tenant_id FROM ref) LIMIT 1),
       v.id
FROM customer_vehicles v
WHERE v.tenant_id = (SELECT tenant_id FROM ref)
  AND v.owner_id = (SELECT owner_id FROM topcli)
  AND EXISTS (SELECT 1 FROM fleet_agreements WHERE tenant_id = (SELECT tenant_id FROM ref));

COMMIT;

-- ── Verificación: distribución de vehículos por cliente ──────────────
WITH d AS (
  SELECT owner_id, count(*) n
  FROM customer_vehicles WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')
  GROUP BY owner_id
)
SELECT
  (SELECT count(*) FROM d)                              AS clientes_con_vehiculos,
  (SELECT count(*) FROM d WHERE n = 1)                 AS con_1,
  (SELECT count(*) FROM d WHERE n BETWEEN 2 AND 3)     AS con_2_3,
  (SELECT count(*) FROM d WHERE n >= 4)                AS con_4_mas,
  (SELECT max(n) FROM d)                                AS max_por_cliente,
  (SELECT round(avg(n), 1) FROM d)                      AS promedio,
  (SELECT count(DISTINCT owner_id) FROM service_orders
     WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS clientes_con_servicios;
