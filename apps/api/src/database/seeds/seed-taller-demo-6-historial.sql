-- =====================================================================
-- Taller Demo — Phase 6: histórico coherente (corrección in-place).
--
-- Arregla las incongruencias del histórico de taller SIN borrar órdenes
-- (para no romper FKs de garantías, recepción y refacciones):
--   · Reparte más la cartera: agrega clientes y vehículos (llega a ~80 unidades)
--     para que ninguna unidad tenga 40+ servicios.
--   · Reasigna las órdenes existentes entre todas las unidades y, por unidad,
--     les da un histórico coherente: km ascendente (10k, 20k, 30k…), el nombre
--     del servicio cuadra con el km, y las fechas se espacian ~200 días
--     (varios años), no todas el mismo día.
--   · Ajusta el kilometraje de cada unidad al de su último servicio.
--   · Reparte también las citas entre las unidades.
--
-- Solo INSERT (clientes/vehículos nuevos) y UPDATE (órdenes/citas/unidades):
-- no borra nada, así que es seguro con las fases 2-5 ya cargadas.
-- Re-ejecutable. Requiere la fase 1.
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

-- ── 1. Más clientes + vehículos (solo la 1ª vez: si aún hay pocos) ────
-- Guarda para no duplicar en re-ejecuciones: solo siembra si hay < 40 unidades.
INSERT INTO clients (id, tenant_id, client_type, is_company, first_name, last_name, phone, email, city, state)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), 'INDIVIDUAL', false,
       (ARRAY['José','María','Luis','Ana','Carlos','Laura','Miguel','Sofía','Jorge','Elena',
              'Pedro','Lucía','Raúl','Diana','Héctor','Paola','Andrés','Karla','Fernando','Gabriela'])[1 + (g % 20)],
       (ARRAY['García','Hernández','Martínez','López','González','Pérez','Rodríguez','Sánchez',
              'Ramírez','Cruz','Flores','Gómez','Díaz','Reyes','Morales','Jiménez'])[1 + (g % 16)],
       '771' || lpad((5200000 + g)::text, 7, '0'),
       'cliente' || g || '@correo-demo.mx', 'Pachuca', 'Hidalgo'
FROM generate_series(1, 66) g
WHERE (SELECT count(*) FROM customer_vehicles WHERE tenant_id = (SELECT tenant_id FROM ref)) < 40;

-- Un vehículo por cada cliente que aún no tenga vehículo (los recién creados).
INSERT INTO customer_vehicles (id, tenant_id, owner_id, vehicle_type, make, model, year, color, plate, vin, mileage)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), c.id,
       (ARRAY['CAR','CAR','CAR','SUV','SUV'])[1 + (c.g % 5)]::customer_vehicles_vehicle_type_enum,
       'Honda',
       (ARRAY['Civic','City','Accord','CR-V','HR-V','BR-V'])[1 + (c.g % 6)],
       2015 + (c.g % 10),
       (ARRAY['Blanco','Negro','Gris','Rojo','Azul','Plata'])[1 + (c.g % 6)],
       'TDM' || lpad(c.g::text, 4, '0'),
       'DEMOVIN' || lpad(c.g::text, 10, '0'),
       15000 + (c.g % 12) * 9000
FROM (
  SELECT c.id, row_number() OVER (ORDER BY c.created_at, c.id) AS g
  FROM clients c
  WHERE c.tenant_id = (SELECT tenant_id FROM ref)
    AND NOT EXISTS (SELECT 1 FROM customer_vehicles v WHERE v.owner_id = c.id)
) c;

-- ── 2. Reasignar + reescribir el histórico de órdenes ────────────────
CREATE TEMP TABLE veh AS
  SELECT row_number() OVER (ORDER BY created_at, id) rn, id AS vehicle_id, owner_id
  FROM customer_vehicles WHERE tenant_id = (SELECT tenant_id FROM ref);

CREATE TEMP TABLE ordn AS
  SELECT row_number() OVER (ORDER BY received_at, id) seq, id
  FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref);

-- Cada orden cae en una unidad (round-robin) y toma una posición 1..P dentro
-- de la unidad (P = cuántas órdenes le tocaron).
CREATE TEMP TABLE plan AS
SELECT o.seq, o.id,
       v.vehicle_id, v.owner_id, v.rn AS veh_rn,
       row_number() OVER (PARTITION BY v.rn ORDER BY o.seq) AS pos,
       count(*)     OVER (PARTITION BY v.rn) AS p_total
FROM ordn o
JOIN veh v ON v.rn = ((o.seq - 1) % (SELECT count(*) FROM veh)) + 1;

-- Fecha real: el último servicio de la unidad cae en los últimos ~90 días
-- (offset por unidad) y cada servicio previo retrocede 200 días.
CREATE TEMP TABLE plan2 AS
SELECT p.*,
  ((( (SELECT hoy FROM ref)
      - ((p.veh_rn * 7) % 90)
      - (p.p_total - p.pos) * 200 )::timestamp) + time '09:00') AS rec
FROM plan p;

UPDATE service_orders so SET
  vehicle_id     = pl.vehicle_id,
  owner_id       = pl.owner_id,
  km_in          = pl.pos * 10000,
  reported_fault = 'Servicio de ' || (pl.pos * 10)::text || ',000 km',
  folio          = 'TDM-' || to_char(pl.rec, 'YYYY') || '-' || lpad(pl.seq::text, 4, '0'),
  received_at    = pl.rec,
  promised_at    = pl.rec + interval '5 hours',
  status = (CASE WHEN pl.rec::date <= (SELECT hoy FROM ref) - 5 THEN 'DELIVERED'
                 ELSE (ARRAY['IN_PROGRESS','READY','WAITING_PARTS','RECEIVED'])[1 + (pl.pos % 4)] END
           )::service_orders_status_enum,
  delivered_at = CASE WHEN pl.rec::date <= (SELECT hoy FROM ref) - 5 THEN pl.rec + interval '6 hours' END,
  diagnosis = CASE WHEN pl.rec::date <= (SELECT hoy FROM ref) - 5
                   THEN 'Servicio realizado; unidad entregada sin observaciones'
                   ELSE 'En proceso en taller' END
FROM plan2 pl
WHERE so.id = pl.id;

-- ── 3. Kilometraje de cada unidad = su último servicio (+ algo de uso) ─
UPDATE customer_vehicles cv SET mileage = m.maxkm + (cv.year % 5) * 800
FROM (
  SELECT vehicle_id, max(km_in) maxkm
  FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref)
  GROUP BY vehicle_id
) m
WHERE cv.id = m.vehicle_id AND cv.tenant_id = (SELECT tenant_id FROM ref);

-- ── 4. Repartir las citas entre las unidades ─────────────────────────
CREATE TEMP TABLE appt AS
  SELECT row_number() OVER (ORDER BY scheduled_at, id) seq, id
  FROM appointments WHERE tenant_id = (SELECT tenant_id FROM ref);

UPDATE appointments ap SET
  vehicle_id   = v.vehicle_id,
  client_id    = v.owner_id,
  client_name  = coalesce(nullif(trim(concat_ws(' ', cl.first_name, cl.last_name)), ''), cl.company_name, 'Cliente'),
  client_phone = cl.phone
FROM appt a
JOIN veh v ON v.rn = ((a.seq - 1) % (SELECT count(*) FROM veh)) + 1
JOIN clients cl ON cl.id = v.owner_id
WHERE ap.id = a.id AND ap.tenant_id = (SELECT tenant_id FROM ref);

-- ── 5. Asignar client_code a los clientes nuevos ─────────────────────
DO $$
DECLARE
  v_tenant uuid;
  v_prefix text;
  v_base   int;
BEGIN
  SELECT id, COALESCE(NULLIF(trim(code_prefix), ''), 'TDM')
    INTO v_tenant, v_prefix
  FROM tenants WHERE slug = 'taller-demo';

  SELECT COALESCE(max(client_number), 0) INTO v_base
  FROM clients WHERE tenant_id = v_tenant;

  WITH faltan AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
    FROM clients
    WHERE tenant_id = v_tenant AND (client_code IS NULL OR client_code = '')
  )
  UPDATE clients c
  SET client_number = v_base + f.n,
      client_code   = v_prefix || 'C' || lpad((v_base + f.n)::text, 8, '0')
  FROM faltan f
  WHERE c.id = f.id;

  INSERT INTO document_code_seq (tenant_id, object_code, last_value)
  VALUES (v_tenant, 'C', (SELECT COALESCE(max(client_number), 0) FROM clients WHERE tenant_id = v_tenant))
  ON CONFLICT (tenant_id, object_code) DO UPDATE SET last_value = EXCLUDED.last_value;
END $$;

COMMIT;

-- ── Verificación ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM clients          WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo') AND deleted_at IS NULL) AS clientes,
  (SELECT count(*) FROM customer_vehicles WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS vehiculos,
  (SELECT count(*) FROM service_orders    WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS ordenes,
  (SELECT round(avg(c),1) FROM (SELECT count(*) c FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') GROUP BY vehicle_id) x) AS ordenes_por_unidad_prom,
  (SELECT max(c) FROM (SELECT count(*) c FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') GROUP BY vehicle_id) x) AS ordenes_por_unidad_max,
  (SELECT count(*) FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug='taller-demo') AND status <> 'DELIVERED') AS activas;
