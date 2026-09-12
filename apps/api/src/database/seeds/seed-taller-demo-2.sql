-- =====================================================================
-- Taller Demo — Phase 2: histórico de los demás módulos.
--
-- Cotizaciones, caja/ventas de mostrador, compras, cuentas por cobrar y
-- pagar, leads y garantías. Repartido en el tiempo para que sus dashboards
-- muestren tendencia. INSERT-only y SCOPED a taller-demo (re-ejecutable, no
-- toca a otros clientes). Requiere haber corrido antes seed-taller-demo.sql
-- (usa sus clientes, refacciones, proveedores y órdenes).
-- =====================================================================

BEGIN;

CREATE TEMP TABLE ref AS
SELECT t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id ORDER BY is_primary DESC, created_at LIMIT 1) AS matriz,
  (SELECT id FROM users WHERE tenant_id = t.id AND email = 'carlos.limon@nexusqtech.com' LIMIT 1) AS admin,
  (SELECT id FROM users WHERE tenant_id = t.id AND email = 'marisol@taller-demo.local' LIMIT 1)    AS asesor,
  (now() AT TIME ZONE 'America/Mexico_City')::date AS hoy
FROM tenants t WHERE t.slug = 'taller-demo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL AND asesor IS NOT NULL) THEN
    RAISE EXCEPTION 'Falta taller-demo o su personal. Corre primero seed-taller-demo.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM parts WHERE tenant_id = (SELECT tenant_id FROM ref)) THEN
    RAISE EXCEPTION 'No hay refacciones en taller-demo. Corre primero seed-taller-demo.sql.';
  END IF;
END $$;

-- ── Limpieza SOLO de lo que siembra esta Phase 2 (re-ejecutable) ─────
DELETE FROM sale_items            WHERE sale_id IN (SELECT id FROM sales WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM sales                 WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM cash_sessions         WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM quotation_items       WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM quotations            WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM quotation_folio_seq   WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM purchase_order_items  WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM purchase_orders       WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM payables              WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM receivables           WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM lead_activities       WHERE lead_id IN (SELECT id FROM leads WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM leads                 WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM warranties            WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── Auxiliares ───────────────────────────────────────────────────────
CREATE TEMP TABLE t_part AS
  SELECT row_number() OVER (ORDER BY sku) rn, id, public_price, purchase_price
  FROM parts WHERE tenant_id = (SELECT tenant_id FROM ref);
CREATE TEMP TABLE t_cli AS
  SELECT row_number() OVER (ORDER BY created_at) rn, id, coalesce(company_name, first_name||' '||last_name) AS nombre, phone
  FROM clients WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── Leads (pipeline CRM), repartidos en 90 días ──────────────────────
INSERT INTO leads (id, tenant_id, branch_id, name, phone, email, source, interest, status, assigned_to, created_at)
SELECT gen_random_uuid(), r.tenant_id, r.matriz, l.nombre, l.tel, l.correo, l.origen, l.interes, l.estado, r.asesor,
       (now() AT TIME ZONE 'America/Mexico_City') - (l.dias || ' days')::interval
FROM ref r, (VALUES
  ('Sofía Delgado Marín',   '7715003001', 'sofia.delgado@correo.mx',  'PORTAL',   'Servicio mayor de su Civic',                 'NEW',         2),
  ('Grupo Logístico Sur',   '7715003004', 'compras@logisticosur.mx',  'REFERIDO', 'Mantenimiento de flotilla (6 unidades)',      'NEW',         1),
  ('Raúl Ibáñez Cortés',    '7715003002', 'raul.ibanez@correo.mx',    'PISO',     'Cotización de balatas y afinación',           'CONTACTED',   6),
  ('Verónica Palma Ruiz',   '7715003003', 'veronica.palma@correo.mx', 'TELEFONO', 'Diagnóstico por testigo encendido',           'QUALIFIED',   9),
  ('Ernesto Salas Ibarra',  '7715003005', 'ernesto.salas@correo.mx',  'PORTAL',   'Servicio de 40,000 km',                       'OPPORTUNITY', 12),
  ('Marcos Lara Peña',      '7715003006', 'marcos.lara@correo.mx',    'PORTAL',   'Aviso de servicio por WhatsApp',              'CONTACTED',   20),
  ('Patricia Ibarra Luna',  '7715002032', 'patricia.ibarra@correo.mx','PISO',     'Servicio de 10,000 km — cerrado',             'WON',         38),
  ('Tomás Vera Zúñiga',     '7715003007', 'tomas.vera@correo.mx',     'TELEFONO', 'Comparó precio y no volvió',                   'LOST',        30),
  ('Distribuidora del Sur', '7715003008', 'taller@distsur.mx',        'REFERIDO', 'Convenio de servicio para 4 autos',           'QUALIFIED',   52),
  ('Andrea Ríos Gómez',     '7715003009', 'andrea.rios@correo.mx',    'PORTAL',   'Servicio de 20,000 km — cerrado',             'WON',         64)
) AS l(nombre, tel, correo, origen, interes, estado, dias);

INSERT INTO lead_activities (lead_id, user_id, type, notes, created_at)
SELECT l.id, r.asesor, a.tipo, a.nota,
       (now() AT TIME ZONE 'America/Mexico_City') - (a.dias || ' days')::interval
FROM ref r, (VALUES
  ('Sofía Delgado Marín',  'LLAMADA', 'Pidió cotización del servicio mayor',            2),
  ('Raúl Ibáñez Cortés',   'VISITA',  'Vino a mostrador por balatas',                   5),
  ('Verónica Palma Ruiz',  'LLAMADA', 'Se agendó diagnóstico',                          8),
  ('Grupo Logístico Sur',  'CORREO',  'Se envió propuesta de flotilla con descuento',   1),
  ('Ernesto Salas Ibarra', 'VISITA',  'Cotizó servicio de 40,000 km',                   4),
  ('Andrea Ríos Gómez',    'VISITA',  'Cerró servicio de 20,000 km',                    64)
) AS a(prospecto, tipo, nota, dias)
JOIN leads l ON l.name = a.prospecto AND l.tenant_id = (SELECT tenant_id FROM ref);

-- ── Cotizaciones (~1 cada 3 días × 90 días) ──────────────────────────
INSERT INTO quotations (id, tenant_id, branch_id, client_id, user_id, type, folio, status,
                        price_list, subtotal, discount_pct, discount_amount, tax_amount, total,
                        conditions, validity_date, created_at)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       cl.id, (SELECT admin FROM ref),
       (ARRAY['PARTS','SERVICE'])[1 + (g.seq % 2)]::quotations_type_enum,
       'COT-' || to_char(g.dia,'YYYY') || '-' || lpad(g.seq::text, 4, '0'),
       (ARRAY['SENT','ACCEPTED','DRAFT'])[1 + (g.seq % 3)]::quotations_status_enum,
       'PUBLIC'::quotations_price_list_enum,
       sub.subtotal, 0, 0, round(sub.subtotal * 0.16, 2), round(sub.subtotal * 1.16, 2),
       'Precios vigentes 15 días.', g.dia + 15,
       g.dia + time '11:00'
FROM (
  SELECT d::date AS dia, row_number() OVER (ORDER BY d) AS seq
  FROM generate_series((SELECT hoy FROM ref) - 89, (SELECT hoy FROM ref), interval '3 day') d
) g
JOIN t_cli cl ON cl.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_cli)) + 1
CROSS JOIN LATERAL (SELECT (900 + (g.seq % 12) * 260)::numeric AS subtotal) sub;

-- Una partida por cotización (la refacción se elige por el folio).
INSERT INTO quotation_items (quotation_id, part_id, description, quantity, unit_price, discount, subtotal)
SELECT q.id, p.id, p.name, 1, p.public_price, 0, p.public_price
FROM quotations q
JOIN t_part p ON p.rn = (abs(hashtext(q.folio)) % (SELECT max(rn) FROM t_part)) + 1
WHERE q.tenant_id = (SELECT tenant_id FROM ref);

INSERT INTO quotation_folio_seq (tenant_id, year, last_value)
SELECT (SELECT tenant_id FROM ref), extract(year FROM (SELECT hoy FROM ref))::int,
       (SELECT count(*) FROM quotations WHERE tenant_id = (SELECT tenant_id FROM ref));

-- ── Caja y ventas de mostrador (últimos 45 días hábiles) ─────────────
-- Una sesión por día (cerradas las pasadas, abierta la de hoy).
INSERT INTO cash_sessions (id, tenant_id, branch_id, user_id, opening_balance,
                           total_cash, total_card, total_transfer, total_sales,
                           opened_at, closed_at, status)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref), (SELECT asesor FROM ref),
       2000, 0, 0, 0, 0,
       d::date + time '08:00',
       CASE WHEN d::date < (SELECT hoy FROM ref) THEN d::date + time '18:00' END,
       CASE WHEN d::date < (SELECT hoy FROM ref) THEN 'CLOSED' ELSE 'OPEN' END
FROM generate_series((SELECT hoy FROM ref) - 44, (SELECT hoy FROM ref), interval '1 day') d
WHERE extract(dow FROM d) <> 0;

-- Tres ventas por sesión, ligadas por el día.
INSERT INTO sales (id, tenant_id, branch_id, cash_session_id, client_id, user_id,
                   sale_type, status, payment_method, price_list, subtotal, discount,
                   tax_amount, total, ticket_number, created_at)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       cs.id, cl.id, (SELECT asesor FROM ref), 'COUNTER', 'PAID',
       (ARRAY['CASH','CARD'])[1 + (g.seq % 2)]::sales_payment_method_enum, 'PUBLIC',
       g.sub, 0, round(g.sub * 0.16, 2), round(g.sub * 1.16, 2),
       'TKT-' || lpad(g.seq::text, 6, '0'),
       g.dia + time '10:00' + ((g.seq % 6) || ' hours')::interval
FROM (
  SELECT dia, k, row_number() OVER (ORDER BY dia, k) AS seq,
         (250 + (row_number() OVER (ORDER BY dia, k) % 10) * 160)::numeric AS sub
  FROM (
    SELECT d::date AS dia FROM generate_series((SELECT hoy FROM ref) - 44, (SELECT hoy FROM ref), interval '1 day') d
    WHERE extract(dow FROM d) <> 0
  ) days CROSS JOIN generate_series(1, 3) k
) g
JOIN cash_sessions cs ON cs.tenant_id = (SELECT tenant_id FROM ref) AND cs.opened_at::date = g.dia
JOIN t_cli cl ON cl.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_cli)) + 1;

-- Una partida por ticket.
INSERT INTO sale_items (sale_id, part_id, quantity, unit_price, discount, subtotal)
SELECT s.id, p.id, 1, p.public_price, 0, p.public_price
FROM sales s
JOIN t_part p ON p.rn = (abs(hashtext(s.ticket_number)) % (SELECT max(rn) FROM t_part)) + 1
WHERE s.tenant_id = (SELECT tenant_id FROM ref);

-- Totales de cada sesión = suma de sus ventas (consistencia).
UPDATE cash_sessions cs SET
  total_sales    = t.total,
  total_cash     = t.efectivo,
  total_card     = t.tarjeta,
  total_transfer = 0
FROM (
  SELECT cash_session_id,
         sum(total) AS total,
         sum(total) FILTER (WHERE payment_method = 'CASH') AS efectivo,
         sum(total) FILTER (WHERE payment_method = 'CARD') AS tarjeta
  FROM sales WHERE tenant_id = (SELECT tenant_id FROM ref)
  GROUP BY cash_session_id
) t
WHERE cs.id = t.cash_session_id;

-- ── Compras a proveedor (repartidas en 90 días) ──────────────────────
INSERT INTO purchase_orders (id, tenant_id, branch_id, supplier_id, user_id, folio, status,
                             subtotal, tax_amount, total, ordered_at, expected_at, received_at, notes)
SELECT gen_random_uuid(), r.tenant_id, r.matriz,
       (SELECT id FROM suppliers WHERE name = o.proveedor AND tenant_id = r.tenant_id),
       r.admin, o.folio, o.estado::purchase_orders_status_enum,
       o.subtotal, round(o.subtotal * 0.16, 2), round(o.subtotal * 1.16, 2),
       r.hoy - o.pedida, r.hoy - o.pedida + 7,
       CASE WHEN o.estado = 'RECEIVED' THEN r.hoy - o.pedida + 5 END, o.nota
FROM ref r, (VALUES
  ('OC-2026-0101', 'Refaccionaria Central de Autos SA',  'RECEIVED', 24800, 80, 'Resurtido de consumibles (marzo)'),
  ('OC-2026-0102', 'Lubricantes Industriales del Norte', 'RECEIVED', 18600, 60, 'Aceite a granel'),
  ('OC-2026-0103', 'Distribuidora Honda Nacional',       'RECEIVED', 15400, 40, 'Filtros y bujías'),
  ('OC-2026-0104', 'Refaccionaria Central de Autos SA',  'RECEIVED', 21200, 20, 'Balatas y discos'),
  ('OC-2026-0105', 'Distribuidora Honda Nacional',       'SENT',      9800,  4, 'Baterías; pendiente de llegar'),
  ('OC-2026-0106', 'Refaccionaria Central de Autos SA',  'DRAFT',    12300,  1, 'Borrador: reposición de filtros')
) AS o(folio, proveedor, estado, subtotal, pedida, nota);

INSERT INTO purchase_order_items (purchase_order_id, part_id, quantity, quantity_received, unit_price, subtotal)
SELECT po.id, p.id, x.cant,
       CASE WHEN po.status = 'RECEIVED' THEN x.cant ELSE 0 END,
       p.purchase_price, p.purchase_price * x.cant
FROM (VALUES
  ('OC-2026-0101', 'ACE-5W30', 60), ('OC-2026-0101', 'FIL-ACE', 40),
  ('OC-2026-0102', 'ACE-5W30', 80),
  ('OC-2026-0103', 'FIL-AIRE', 30), ('OC-2026-0103', 'BUJ-ILZ', 12),
  ('OC-2026-0104', 'BAL-DEL', 24),  ('OC-2026-0104', 'DIS-DEL', 8),
  ('OC-2026-0105', 'BAT-46B24', 8),
  ('OC-2026-0106', 'FIL-CAB', 30)
) AS x(folio, sku, cant)
JOIN purchase_orders po ON po.folio = x.folio AND po.tenant_id = (SELECT tenant_id FROM ref)
JOIN parts p            ON p.sku    = x.sku   AND p.tenant_id  = (SELECT tenant_id FROM ref);

-- ── Cuentas por pagar ────────────────────────────────────────────────
INSERT INTO payables (id, tenant_id, branch_id, supplier_id, reference_type, concept, total, paid_amount, due_date, status)
SELECT gen_random_uuid(), r.tenant_id, r.matriz,
       (SELECT id FROM suppliers WHERE name = c.proveedor AND tenant_id = r.tenant_id),
       'PurchaseOrder', c.concepto, c.total, c.pagado, r.hoy + c.vence, c.estado
FROM ref r, (VALUES
  ('Refaccionaria Central de Autos SA',  'OC-2026-0101 resurtido',       28768, 28768, -20, 'PAID'),
  ('Lubricantes Industriales del Norte', 'OC-2026-0102 aceite a granel', 21576, 10000,   6, 'PARTIAL'),
  ('Distribuidora Honda Nacional',       'OC-2026-0105 baterías',        11368, 0,       18, 'OPEN')
) AS c(proveedor, concepto, total, pagado, vence, estado);

-- ── Cuentas por cobrar (crédito de flotilla por servicio) ────────────
INSERT INTO receivables (id, tenant_id, branch_id, client_id, reference_type, concept, total, paid_amount, due_date, status)
SELECT gen_random_uuid(), r.tenant_id, r.matriz,
       (SELECT id FROM clients WHERE company_name = c.empresa AND tenant_id = r.tenant_id),
       'ServiceOrder', c.concepto, c.total, c.pagado, r.hoy + c.vence, c.estado
FROM ref r, (VALUES
  ('Mensajería Rápida del Centro SA de CV', 'Servicio de flotilla (3 unidades)', 9280, 4000,  10, 'PARTIAL'),
  ('Distribuidora Ferretera del Bajío SA',  'Afinación y frenos',                4600, 0,      -5, 'OPEN'),
  ('Mensajería Rápida del Centro SA de CV', 'Servicio de 20,000 km',             3480, 3480, -18, 'PAID')
) AS c(empresa, concepto, total, pagado, vence, estado);

-- ── Garantías (sobre órdenes ya entregadas) ──────────────────────────
INSERT INTO warranties (id, tenant_id, branch_id, client_id, vehicle_id, service_order_id,
                        type, description, status, resolution, start_date, end_date)
SELECT gen_random_uuid(), so.tenant_id, so.branch_id, so.owner_id, so.vehicle_id, so.id,
       g.tipo::warranties_type_enum, g.descripcion, g.estado::warranties_status_enum, g.resolucion,
       (SELECT hoy FROM ref) - g.desde, (SELECT hoy FROM ref) - g.desde + 365
FROM (
  SELECT id, tenant_id, branch_id, owner_id, vehicle_id,
         row_number() OVER (ORDER BY received_at DESC) rn
  FROM service_orders
  WHERE tenant_id = (SELECT tenant_id FROM ref) AND status = 'DELIVERED'
) so
JOIN (VALUES
  (1, 'PART',    'Batería falló dentro del periodo de garantía', 'IN_PROGRESS', NULL,                              20),
  (2, 'SERVICE', 'Ruido tras el cambio de balatas',              'RESOLVED',    'Se reajustó sin costo',           35),
  (3, 'UNIT',    'Vibración tras la afinación',                  'OPEN',        NULL,                              8)
) AS g(rn, tipo, descripcion, estado, resolucion, desde) ON g.rn = so.rn;

COMMIT;

SELECT
  (SELECT count(*) FROM quotations     WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS cotizaciones,
  (SELECT count(*) FROM sales          WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS ventas_mostrador,
  (SELECT count(*) FROM purchase_orders WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS compras,
  (SELECT count(*) FROM leads          WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS leads;
