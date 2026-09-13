-- =====================================================================
-- Taller Demo — Phase 4: Recepción (checklists) + Seminuevos (tomas).
--
-- Recepción: checklist de recepción sobre órdenes ya entregadas (documenta el
-- estado de la unidad al recibirla; SIN fotos, requieren archivos en B2).
-- Seminuevos: tomas/avalúos de compra a particular.
-- INSERT-only, scoped a taller-demo, re-ejecutable. Requiere seed-taller-demo.sql.
--
-- CFDI queda fuera: el timbrado es en vivo con FacturAPI, no se puede sembrar.
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
DELETE FROM reception_checklists
 WHERE service_order_id IN (SELECT id FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM used_unit_intakes WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── Recepción: checklist sobre 8 órdenes entregadas ──────────────────
INSERT INTO reception_checklists (service_order_id, user_id, fuel_level, km_in,
                                  has_spare_tire, has_tools, has_documents, has_mats, observations)
SELECT so.id, (SELECT admin FROM ref),
       (50 + (so.rn % 5) * 10)::int,
       coalesce(so.km_in, 30000),
       true, true, true, (so.rn % 2 = 0),
       'Recepción de demostración; unidad sin daños relevantes.'
FROM (
  SELECT id, km_in, row_number() OVER (ORDER BY received_at DESC) AS rn
  FROM service_orders
  WHERE tenant_id = (SELECT tenant_id FROM ref) AND status = 'DELIVERED'
  LIMIT 8
) so;

-- ── Seminuevos: tomas/avalúos ────────────────────────────────────────
INSERT INTO used_unit_intakes (id, tenant_id, branch_id, seller_name, seller_phone,
                               brand, model, year, plate, vin, km,
                               asking_price, appraised_value, offered_value, status, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       v.seller, v.tel, v.marca, v.modelo, v.anio, v.placa, v.vin, v.km,
       v.pide, v.avaluo, v.oferta, v.estado, v.nota
FROM (VALUES
  ('José Ramírez',   '7717001001', 'Honda', 'Civic 2019', 2019, 'HGX-1121', '19XFC1F30KE100001', 78000,  235000, 210000, 205000, 'APPRAISED', 'Unidad de un dueño, servicios de agencia.'),
  ('Laura Bautista', '7717001002', 'Nissan','Versa 2020', 2020, 'NVR-4432', '3N1CN7AD0LL200002', 62000,  195000, 175000, 172000, 'ACCEPTED',  'Toma a cuenta de un CR-V.'),
  ('Grupo Reparto',  '7717001003', 'Honda', 'City 2018',  2018, 'CTY-8890', 'MRHGM6630JP300003', 120000, 175000, 150000, 148000, 'DRAFT',     'Flotilla: 3 unidades por valuar.')
) AS v(seller, tel, marca, modelo, anio, placa, vin, km, pide, avaluo, oferta, estado, nota);

COMMIT;

SELECT
  (SELECT count(*) FROM reception_checklists rc
     JOIN service_orders so ON so.id = rc.service_order_id
     WHERE so.tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS recepciones,
  (SELECT count(*) FROM used_unit_intakes WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS seminuevos;
