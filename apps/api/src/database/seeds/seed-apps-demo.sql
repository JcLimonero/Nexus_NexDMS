-- =====================================================================
-- Datos para demo de PWA (técnico) y Recepción — parametrizado por :slug.
--
-- Deja listo lo que consumen ambas apps:
--   · PWA técnico: agenda del día filtra por mechanic_id → se asigna mecánico
--     a las citas y a las órdenes activas.
--   · Recepción: agenda por sucursal → se agregan ~6 semanas de citas futuras
--     (con mecánico, asesor y sucursal) además de las existentes.
--
-- Uso: psql ... -v slug=taller-demo -f seed-apps-demo.sql
-- Re-ejecutable: borra su propio lote de citas futuras (notes='demo-agenda').
-- =====================================================================

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS matriz,
  (now() AT TIME ZONE 'America/Mexico_City')::date AS hoy
FROM tenants t WHERE t.slug = :'slug';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe el tenant indicado en :slug';
  END IF;
END $$;

-- Mecánicos y asesores del tenant, numerados para repartir.
CREATE TEMP TABLE mecs AS
  SELECT (row_number() OVER (ORDER BY u.email))::int rn, u.id
  FROM users u JOIN user_roles r ON r.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND r.role = 'MECHANIC' AND u.is_active;
CREATE TEMP TABLE advs AS
  SELECT (row_number() OVER (ORDER BY u.email))::int rn, u.id
  FROM users u JOIN user_roles r ON r.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND r.role = 'RECEPTIONIST' AND u.is_active;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mecs) THEN RAISE EXCEPTION 'El tenant no tiene mecánicos activos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM advs) THEN RAISE EXCEPTION 'El tenant no tiene asesores (RECEPTIONIST) activos'; END IF;
END $$;

-- ── 1. Asignar mecánico a las citas que no lo tienen ─────────────────
UPDATE appointments a SET mechanic_id = m.id
FROM (
  SELECT id, ((row_number() OVER (ORDER BY scheduled_at)) % (SELECT count(*) FROM mecs))::int AS k
  FROM appointments
  WHERE tenant_id = (SELECT tenant_id FROM ref) AND mechanic_id IS NULL
) x
JOIN mecs m ON m.rn = x.k + 1
WHERE a.id = x.id;

-- ── 2. Asignar mecánico a las órdenes activas sin mecánico ───────────
UPDATE service_orders so SET mechanic_id = m.id
FROM (
  SELECT id, ((row_number() OVER (ORDER BY received_at)) % (SELECT count(*) FROM mecs))::int AS k
  FROM service_orders
  WHERE tenant_id = (SELECT tenant_id FROM ref)
    AND status NOT IN ('DELIVERED','CANCELLED') AND mechanic_id IS NULL
) x
JOIN mecs m ON m.rn = x.k + 1
WHERE so.id = x.id;

-- ── 3. Agenda futura (próximas ~6 semanas) para PWA y Recepción ──────
DELETE FROM appointments
 WHERE tenant_id = (SELECT tenant_id FROM ref) AND notes = 'demo-agenda';

CREATE TEMP TABLE tveh AS
  SELECT (row_number() OVER (ORDER BY random()))::int rn, v.id AS vehicle_id, v.owner_id
  FROM customer_vehicles v WHERE v.tenant_id = (SELECT tenant_id FROM ref);

INSERT INTO appointments (id, tenant_id, branch_id, client_id, vehicle_id, advisor_id, mechanic_id,
                          origin, status, service_type, client_name, client_phone,
                          scheduled_at, duration_min, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       v.owner_id, v.vehicle_id, a.id, m.id,
       'INTERNAL'::appointments_origin_enum,
       (ARRAY['SCHEDULED','CONFIRMED','PENDING_CONFIRMATION'])[1 + (g.seq % 3)]::appointments_status_enum,
       (ARRAY['Servicio de 10,000 km','Afinación mayor','Cambio de aceite','Revisión de frenos','Diagnóstico general','Alineación y balanceo'])[1 + (g.seq % 6)],
       coalesce(nullif(trim(cl.first_name || ' ' || coalesce(cl.last_name, '')), ''), cl.company_name, 'Cliente'),
       cl.phone,
       g.dia + time '09:00' + ((g.seq % 8) || ' hours')::interval, 60, 'demo-agenda'
FROM (
  SELECT d::date AS dia, k, (row_number() OVER (ORDER BY d, k))::int AS seq
  FROM generate_series((SELECT hoy FROM ref) + 1, (SELECT hoy FROM ref) + 42, interval '1 day') d
  CROSS JOIN generate_series(1, 2) k
  WHERE extract(dow FROM d) <> 0        -- sin domingos
) g
JOIN tveh v ON v.rn = ((g.seq - 1) % (SELECT count(*) FROM tveh)) + 1
JOIN mecs m ON m.rn = ((g.seq - 1) % (SELECT count(*) FROM mecs)) + 1
JOIN advs a ON a.rn = ((g.seq - 1) % (SELECT count(*) FROM advs)) + 1
JOIN clients cl ON cl.id = v.owner_id;

COMMIT;

-- ── Verificación ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM appointments WHERE tenant_id=(SELECT id FROM tenants WHERE slug=:'slug')) AS citas_total,
  (SELECT count(*) FROM appointments WHERE tenant_id=(SELECT id FROM tenants WHERE slug=:'slug') AND mechanic_id IS NOT NULL) AS con_mecanico,
  (SELECT count(*) FROM appointments WHERE tenant_id=(SELECT id FROM tenants WHERE slug=:'slug') AND scheduled_at::date >= now()::date) AS futuras,
  (SELECT max(scheduled_at)::date FROM appointments WHERE tenant_id=(SELECT id FROM tenants WHERE slug=:'slug')) AS ultima_cita,
  (SELECT count(*) FROM service_orders WHERE tenant_id=(SELECT id FROM tenants WHERE slug=:'slug') AND status NOT IN ('DELIVERED','CANCELLED') AND mechanic_id IS NOT NULL) AS ordenes_activas_con_mec;
