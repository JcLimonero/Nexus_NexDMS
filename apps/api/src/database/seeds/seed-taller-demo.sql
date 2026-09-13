-- =====================================================================
-- Datos de demostración para el tenant "Taller Demo" (slug: taller-demo).
--
-- Foco en TALLER (servicio): 90 días de órdenes de servicio y citas de
-- -30 a +30 días. INSERT-only y SCOPED a este tenant: la limpieza inicial
-- borra SOLO lo operativo de taller-demo, así que es re-ejecutable y no
-- toca a ningún otro cliente de la BD.
--
-- Requiere que el tenant ya exista (creado por el wizard "Alta de empresa"),
-- con su sucursal Matriz y su usuario admin.
--
-- Uso local:   DATABASE_URL="postgres://...local..." \
--                ts-node -r tsconfig-paths/register \
--                src/database/seeds/run-file.ts seed-taller-demo.sql
-- Uso prod:    NODE_ENV=production DATABASE_URL="<external-url>" node ...   (ver run instructions)
--   o desde DBeaver: pega este archivo completo y ejecútalo.
--
-- Horas en hora local (TZ=America/Mexico_City).
-- =====================================================================

BEGIN;

-- ── Referencias ──────────────────────────────────────────────────────
CREATE TEMP TABLE ref AS
SELECT
  t.id AS tenant_id,
  (SELECT id FROM branches WHERE tenant_id = t.id
     ORDER BY is_primary DESC, created_at LIMIT 1)       AS matriz,
  (SELECT id FROM users WHERE tenant_id = t.id
     AND email = 'carlos.limon@nexusqtech.com' LIMIT 1)  AS admin,
  (now() AT TIME ZONE 'America/Mexico_City')::date        AS hoy
FROM tenants t
WHERE t.slug = 'taller-demo';

-- Corta en seco si el tenant no existe (evita insertar 0 filas en silencio).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ref WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existe el tenant taller-demo (o su sucursal/admin). Créalo primero con el wizard.';
  END IF;
END $$;

-- ── Limpieza SOLO de taller-demo (re-ejecutable) ─────────────────────
-- Hijos por su padre (por si alguna FK no es CASCADE), luego los padres,
-- todo acotado por tenant.
DELETE FROM service_order_parts   WHERE service_order_id IN (SELECT id FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM service_order_phases  WHERE service_order_id IN (SELECT id FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM service_orders        WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM service_order_folio_seq WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM appointments          WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM service_type_parts    WHERE service_type_id IN (SELECT id FROM service_types WHERE tenant_id = (SELECT tenant_id FROM ref));
DELETE FROM service_types         WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM parts                 WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM stock_locations       WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM part_categories       WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM suppliers             WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM vehicle_ownerships    WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM customer_vehicles     WHERE tenant_id = (SELECT tenant_id FROM ref);
DELETE FROM clients               WHERE tenant_id = (SELECT tenant_id FROM ref);
-- Personal sembrado por este script (no borra al admin del wizard). Primero
-- sus filas en las tablas de enlace (rol y sucursal), luego el usuario.
DELETE FROM user_roles    WHERE user_id IN (SELECT id FROM users WHERE tenant_id = (SELECT tenant_id FROM ref) AND email LIKE '%@taller-demo.local');
DELETE FROM user_branches WHERE user_id IN (SELECT id FROM users WHERE tenant_id = (SELECT tenant_id FROM ref) AND email LIKE '%@taller-demo.local');
DELETE FROM users         WHERE tenant_id = (SELECT tenant_id FROM ref) AND email LIKE '%@taller-demo.local';

-- ── Personal: asesores y mecánicos ───────────────────────────────────
-- Esquema actual: users NO tiene branch_id ni columna role. El rol va en
-- user_roles y la sucursal en user_branches. password_hash = 'demo123'.
INSERT INTO users (id, tenant_id, first_name, last_name, email, password_hash, scope, phone, is_active)
SELECT gen_random_uuid(), r.tenant_id, u.nombre, u.apellido, u.correo,
       '$2b$12$jmkMZjoY/hKN.bKJoDwQLuLauOn0SyrHsREeRvjwAH98n7veAaYf2',
       'SUCURSAL'::users_scope_enum, u.tel, true
FROM ref r, (VALUES
  ('Marisol', 'Vega Ríos',      'marisol@taller-demo.local',  'RECEPTIONIST', '7712000101'),
  ('Diego',   'Fuentes Lara',   'asesor2@taller-demo.local',  'RECEPTIONIST', '7712000102'),
  ('Luis',    'Ramírez Soto',   'mecanico1@taller-demo.local','MECHANIC',     '7712000111'),
  ('Karina',  'Soto Medina',    'mecanico2@taller-demo.local','MECHANIC',     '7712000112'),
  ('Pedro',   'Gómez Nava',     'mecanico3@taller-demo.local','MECHANIC',     '7712000113')
) AS u(nombre, apellido, correo, rol, tel);

-- Rol de cada uno (user_roles).
INSERT INTO user_roles (user_id, role)
SELECT us.id, v.rol::users_role_enum
FROM users us
JOIN (VALUES
  ('marisol@taller-demo.local',  'RECEPTIONIST'),
  ('asesor2@taller-demo.local',  'RECEPTIONIST'),
  ('mecanico1@taller-demo.local','MECHANIC'),
  ('mecanico2@taller-demo.local','MECHANIC'),
  ('mecanico3@taller-demo.local','MECHANIC')
) AS v(correo, rol) ON us.email = v.correo
WHERE us.tenant_id = (SELECT tenant_id FROM ref);

-- Asignación a la sucursal Matriz (user_branches) para que aparezcan en agenda.
INSERT INTO user_branches (user_id, branch_id, is_default)
SELECT us.id, (SELECT matriz FROM ref), true
FROM users us
WHERE us.tenant_id = (SELECT tenant_id FROM ref) AND us.email LIKE '%@taller-demo.local';

-- ── Clientes ─────────────────────────────────────────────────────────
INSERT INTO clients (id, tenant_id, client_type, is_company, first_name, last_name,
                     company_name, rfc, phone, email, address, city, state, fixed_discount)
SELECT gen_random_uuid(), r.tenant_id, c.tipo::clients_client_type_enum, c.empresa,
       c.nombre, c.apellido, c.razon, c.rfc, c.tel, c.correo, c.dir, 'Pachuca', 'Hidalgo', c.desc_fijo
FROM ref r, (VALUES
  ('INDIVIDUAL', false, 'Laura',    'Mendoza Rivas',  NULL, 'MERL880412H23', '7715002030', 'laura.mendoza@correo.mx',   'Av. Revolución 450, Centro', 0),
  ('INDIVIDUAL', false, 'Roberto',  'Silva Ortega',   NULL, 'SIOR751130KL8', '7715002031', 'roberto.silva@correo.mx',   'Blvd. Everardo Márquez 22',  0),
  ('INDIVIDUAL', false, 'Patricia', 'Ibarra Luna',    NULL, 'IALP920825RT4', '7715002032', 'patricia.ibarra@correo.mx', 'Camino Real de la Plata 120',0),
  ('INDIVIDUAL', false, 'Miguel',   'Rojas Cabrera',  NULL, 'ROCM840617PP1', '7715002033', 'miguel.rojas@correo.mx',    'Av. Juárez 88, Centro',      0),
  ('INDIVIDUAL', false, 'Ana',      'Ruiz Vega',      NULL, 'RUVA900203GH6', '7715002034', 'ana.ruiz@correo.mx',        'Blvd. Felipe Ángeles 900',   0),
  ('INDIVIDUAL', false, 'Jorge',    'Hernández Paz',  NULL, 'HEPJ870914BN2', '7715002035', 'jorge.hernandez@correo.mx', 'Prol. Madero 315',           0),
  ('INDIVIDUAL', false, 'Claudia',  'Ramos Beltrán',  NULL, 'RABC950728DF3', '7715002036', 'claudia.ramos@correo.mx',   'Av. Cuauhtémoc 77',          0),
  ('INDIVIDUAL', false, 'Fernando', 'Nava Estrada',   NULL, 'NAEF821005QW9', '7715002037', 'fernando.nava@correo.mx',   'Carr. México-Pachuca 4000',  0),
  ('INDIVIDUAL', false, 'Sofía',    'Herrera Cano',   NULL, 'HECS930611AA1', '7715002038', 'sofia.herrera@correo.mx',   'Fracc. San Javier 12',       0),
  ('INDIVIDUAL', false, 'Guillermo','Ponce Díaz',     NULL, 'PODG860220ZZ2', '7715002039', 'guillermo.ponce@correo.mx', 'Col. Céspedes 45',           0),
  ('BUSINESS',   true,  NULL, NULL, 'Mensajería Rápida del Centro SA de CV', 'MRC180322TY5', '7715002040', 'flotilla@mensajeriarapida.mx', 'Parque Industrial 1200', 8),
  ('BUSINESS',   true,  NULL, NULL, 'Distribuidora Ferretera del Bajío SA',  'DFB150710UI7', '7715002041', 'compras@ferreterabajio.mx',    'Av. Industrial 55',      5)
) AS c(tipo, empresa, nombre, apellido, razon, rfc, tel, correo, dir, desc_fijo);

-- ── Vehículos (autos y camionetas) ───────────────────────────────────
INSERT INTO customer_vehicles (id, tenant_id, owner_id, vehicle_type, make, model, year,
                               color, plate, vin, mileage)
SELECT gen_random_uuid(), r.tenant_id,
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = v.dueno AND tenant_id = r.tenant_id LIMIT 1),
       v.tipo::customer_vehicles_vehicle_type_enum, v.marca, v.modelo, v.anio, v.color, v.placa, v.vin, v.km
FROM ref r, (VALUES
  ('Mendoza Rivas',  'CAR', 'Honda', 'Civic',   2022, 'Gris',   'HGT-4401', '19XFC2F5XNE200145', 38420),
  ('Silva Ortega',   'SUV', 'Honda', 'CR-V',    2021, 'Negro',  'JPT-2210', '5J6RW2H80NL100322', 51380),
  ('Ibarra Luna',    'SUV', 'Honda', 'HR-V',    2023, 'Blanco', 'KTS-8890', '3CZRZ1H30PM300871', 21140),
  ('Rojas Cabrera',  'CAR', 'Honda', 'City',    2022, 'Plata',  'LKL-5512', 'MRHGM6630NP045512', 41250),
  ('Ruiz Vega',      'CAR', 'Honda', 'Civic',   2020, 'Azul',   'QWE-3344', '19XFC1F30LE199033', 64680),
  ('Hernández Paz',  'SUV', 'Honda', 'BR-V',    2023, 'Blanco', 'ZXC-1188', 'MRHDG1650PP400218', 31900),
  ('Ramos Beltrán',  'CAR', 'Honda', 'City',    2024, 'Rojo',   'BNM-7766', 'MRHGM6630RP298744', 16710),
  ('Nava Estrada',   'SUV', 'Honda', 'CR-V',    2021, 'Verde',  'POI-9922', '5J6RW2H80ML155390', 55890),
  ('Herrera Cano',   'CAR', 'Honda', 'Accord',  2022, 'Negro',  'SFH-3390', '1HGCV1F30NA033221', 39250),
  ('Ponce Díaz',     'CAR', 'Honda', 'Civic',   2021, 'Blanco', 'GPD-9908', '19XFC1F30ME024551', 47780),
  ('Mensajería Rápida del Centro SA de CV', 'VAN', 'Honda', 'Odyssey', 2022, 'Blanco', 'FLT-1001', '5FNRL6H80NB401001', 62300),
  ('Mensajería Rápida del Centro SA de CV', 'SUV', 'Honda', 'CR-V',    2022, 'Blanco', 'FLT-1002', '5J6RW2H80NL401002', 58750),
  ('Mensajería Rápida del Centro SA de CV', 'SUV', 'Honda', 'HR-V',    2023, 'Blanco', 'FLT-1003', '3CZRZ1H30PM401003', 22400),
  ('Distribuidora Ferretera del Bajío SA',  'CAR', 'Honda', 'City',    2021, 'Azul',   'FER-2001', 'MRHGM6630MP402001', 48150)
) AS v(dueno, tipo, marca, modelo, anio, color, placa, vin, km);

-- ── Historial de propiedad ───────────────────────────────────────────
INSERT INTO vehicle_ownerships (tenant_id, vehicle_id, client_id, from_date, source, notes)
SELECT r.tenant_id, v.id, v.owner_id, r.hoy - 400, 'ALTA', 'Dueño registrado al dar de alta el vehículo'
FROM ref r, customer_vehicles v
WHERE v.tenant_id = r.tenant_id;

-- ── Almacén: categorías, ubicaciones, proveedores ────────────────────
INSERT INTO part_categories (id, tenant_id, name, description, is_active)
SELECT gen_random_uuid(), r.tenant_id, c.nombre, c.descr, true
FROM ref r, (VALUES
  ('Lubricantes', 'Aceites y líquidos'),
  ('Filtros',     'Aceite, aire, cabina y gasolina'),
  ('Frenos',      'Balatas, discos y líquidos'),
  ('Suspensión',  'Amortiguadores y bujes'),
  ('Eléctrico',   'Baterías, focos y bujías'),
  ('Motor',       'Bandas, empaques y bujías')
) AS c(nombre, descr);

INSERT INTO stock_locations (id, tenant_id, branch_id, code, zone, aisle, shelf, level, description, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.matriz, u.codigo, u.zona, u.pasillo, u.anaquel, u.nivel, u.descr, true
FROM ref r, (VALUES
  ('A-01-1', 'Almacén', 'A', '01', '1', 'Lubricantes'),
  ('A-02-1', 'Almacén', 'A', '02', '1', 'Filtros'),
  ('B-01-2', 'Almacén', 'B', '01', '2', 'Frenos'),
  ('C-01-1', 'Almacén', 'C', '01', '1', 'Suspensión'),
  ('D-02-3', 'Almacén', 'D', '02', '3', 'Eléctrico y motor')
) AS u(codigo, zona, pasillo, anaquel, nivel, descr);

INSERT INTO suppliers (id, tenant_id, name, contact_name, phone, email, rfc, payment_terms, credit_days, is_active)
SELECT gen_random_uuid(), r.tenant_id, p.nombre, p.contacto, p.tel, p.correo, p.rfc, p.terminos, p.dias, true
FROM ref r, (VALUES
  ('Refaccionaria Central de Autos SA', 'Ing. Óscar Medina',  '7712001010', 'ventas@refaccionariacentral.mx', 'RCA090812AB4', 'CREDITO', 30),
  ('Distribuidora Honda Nacional',      'Lic. Marcela Ponce', '7712001011', 'pedidos@hondanacional.mx',       'DHN050303CD7', 'CREDITO', 45),
  ('Lubricantes Industriales del Norte','Ing. Paola Cruz',    '7712001013', 'contacto@lubrinorte.mx',         'LIN140505GH2', 'CREDITO', 15)
) AS p(nombre, contacto, tel, correo, rfc, terminos, dias);

-- ── Refacciones ──────────────────────────────────────────────────────
INSERT INTO parts (id, tenant_id, branch_id, category_id, location_id, sku, name,
                   description, vehicle_type, unit_of_measure, purchase_price,
                   public_price, wholesale_price, business_price,
                   stock_quantity, min_stock, max_stock, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.matriz,
       (SELECT id FROM part_categories WHERE name = p.familia AND tenant_id = r.tenant_id),
       (SELECT id FROM stock_locations WHERE code = p.ubicacion AND tenant_id = r.tenant_id),
       p.sku, p.nombre, p.descr, 'CAR', p.unidad, p.compra, p.publico, p.mayoreo, p.empresa,
       p.stock, p.minimo, p.maximo, true
FROM ref r, (VALUES
  ('ACE-5W30',  'Aceite 5W-30 sintético (litro)', 'Motor gasolina', 'LITRO', 130, 240, 216, 204, 60, 15, 120, 'Lubricantes', 'A-01-1'),
  ('ACE-5W20',  'Aceite 5W-20 sintético (litro)', 'Motor gasolina', 'LITRO', 128, 235, 211, 200, 40, 12, 100, 'Lubricantes', 'A-01-1'),
  ('FIL-ACE',   'Filtro de aceite',   'Civic/CR-V/HR-V',      'PIEZA', 90,  180, 162, 153, 45, 10, 60, 'Filtros', 'A-02-1'),
  ('FIL-AIRE',  'Filtro de aire',     'Motor',                'PIEZA', 160, 310, 279, 264, 8,  8,  40, 'Filtros', 'A-02-1'),
  ('FIL-CAB',   'Filtro de cabina',   'A/C',                  'PIEZA', 140, 270, 243, 230, 20, 8,  40, 'Filtros', 'A-02-1'),
  ('BUJ-ILZ',   'Bujía NGK Laser Iridium', 'Juego 4',         'JUEGO', 520, 980, 882, 833, 18, 6,  30, 'Motor',   'D-02-3'),
  ('BAL-DEL',   'Balatas delanteras', 'Juego',                'JUEGO', 380, 720, 648, 612, 22, 8,  40, 'Frenos',  'B-01-2'),
  ('BAL-TRA',   'Balatas traseras',   'Juego',                'JUEGO', 340, 650, 585, 553, 6,  8,  40, 'Frenos',  'B-01-2'),
  ('DIS-DEL',   'Discos delanteros',  'Par',                  'PAR',   980, 1750,1575,1487, 8,  4,  20, 'Frenos',  'B-01-2'),
  ('LIQ-FRE',   'Líquido de frenos DOT-4', '500 ml',          'PIEZA', 110, 210, 189, 178, 25, 8,  40, 'Frenos',  'B-01-2'),
  ('BAT-46B24', 'Batería 46B24L',     '12V',                  'PIEZA', 1250,2200,1980,1870, 10, 4,  20, 'Eléctrico','D-02-3'),
  ('BAN-ACC',   'Banda de accesorios','Poly-V',               'PIEZA', 260, 500, 450, 425, 12, 5,  25, 'Motor',   'D-02-3'),
  ('AMO-DEL',   'Amortiguador delantero','Pieza',             'PIEZA', 890, 1650,1485,1402, 6,  4,  20, 'Suspensión','C-01-1'),
  ('LIM-PAR',   'Plumas limpiaparabrisas','Par',              'PAR',   150, 300, 270, 255, 30, 10, 50, 'Motor',   'D-02-3')
) AS p(sku, nombre, descr, unidad, compra, publico, mayoreo, empresa, stock, minimo, maximo, familia, ubicacion);

-- ── Tipos de servicio ────────────────────────────────────────────────
INSERT INTO service_types (id, tenant_id, branch_id, code, name, description, category,
                           duration_min, requires_ramp, ramp_duration_min,
                           recurrence_km_interval, recurrence_months_interval, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.matriz, s.codigo, s.nombre, s.descr,
       s.cat::service_types_category_enum, s.dur, s.rampa, s.dur_rampa, s.km, s.meses, true
FROM ref r, (VALUES
  ('MTTO-10K', 'Servicio de 10,000 km', 'Aceite, filtro de aceite y revisión de 21 puntos', 'MAINTENANCE', 90,  true, 60, 10000, 6),
  ('MTTO-20K', 'Servicio de 20,000 km', 'Aceite, filtros de aceite y aire, y frenos',       'MAINTENANCE', 120, true, 90, 20000, 12),
  ('MTTO-40K', 'Servicio de 40,000 km', 'Servicio mayor: aceite, filtros, bujías y frenos', 'MAINTENANCE', 180, true, 120,40000, 24),
  ('FRENOS',   'Cambio de balatas',     'Delanteras o traseras, con rectificado si aplica',  'REPAIR',      90,  true, 60, NULL,  NULL),
  ('AFINACION','Afinación mayor',       'Bujías, filtros y limpieza de inyectores',          'REPAIR',      150, true, 120,NULL,  NULL),
  ('DIAG',     'Diagnóstico',           'Revisión con escáner, con el cliente presente',     'DIAGNOSIS',   45,  false,NULL,NULL,  NULL)
) AS s(codigo, nombre, descr, cat, dur, rampa, dur_rampa, km, meses);

INSERT INTO service_type_parts (service_type_id, part_id, quantity_required)
SELECT st.id, p.id, x.cant
FROM (VALUES
  ('MTTO-10K','ACE-5W30', 4), ('MTTO-10K','FIL-ACE', 1),
  ('MTTO-20K','ACE-5W30', 4), ('MTTO-20K','FIL-ACE', 1), ('MTTO-20K','FIL-AIRE', 1),
  ('MTTO-40K','ACE-5W30', 4), ('MTTO-40K','FIL-ACE', 1), ('MTTO-40K','FIL-AIRE', 1), ('MTTO-40K','BUJ-ILZ', 1),
  ('FRENOS',  'BAL-DEL', 1),  ('FRENOS','LIQ-FRE', 1),
  ('AFINACION','BUJ-ILZ',1),  ('AFINACION','FIL-AIRE',1)
) AS x(codigo, sku, cant)
JOIN service_types st ON st.code = x.codigo AND st.tenant_id = (SELECT tenant_id FROM ref)
JOIN parts p          ON p.sku   = x.sku   AND p.tenant_id  = (SELECT tenant_id FROM ref);

-- ── Tablas auxiliares para los generadores (elección determinista) ────
CREATE TEMP TABLE t_veh AS
  SELECT row_number() OVER (ORDER BY plate) rn, id, owner_id, mileage
  FROM customer_vehicles WHERE tenant_id = (SELECT tenant_id FROM ref);
CREATE TEMP TABLE t_mech AS
  SELECT row_number() OVER (ORDER BY u.email) rn, u.id
  FROM users u JOIN user_roles ur ON ur.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND ur.role = 'MECHANIC';
CREATE TEMP TABLE t_adv AS
  SELECT row_number() OVER (ORDER BY u.email) rn, u.id
  FROM users u JOIN user_roles ur ON ur.user_id = u.id
  WHERE u.tenant_id = (SELECT tenant_id FROM ref) AND ur.role = 'RECEPTIONIST';
CREATE TEMP TABLE t_svc AS
  SELECT row_number() OVER (ORDER BY code) rn, id, name, duration_min
  FROM service_types WHERE tenant_id = (SELECT tenant_id FROM ref);
CREATE TEMP TABLE t_part AS
  SELECT row_number() OVER (ORDER BY sku) rn, id, public_price
  FROM parts WHERE tenant_id = (SELECT tenant_id FROM ref);

-- ── Órdenes de servicio: ~8/día hábil × 90 días ──────────────────────
INSERT INTO service_orders (id, tenant_id, branch_id, owner_id, vehicle_id, user_id,
                            mechanic_id, folio, status, reported_fault, diagnosis,
                            km_in, labor_cost, parts_cost, discount, total,
                            received_at, promised_at, delivered_at, tracking_token)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       v.owner_id, v.id, a.id, m.id,
       'TDM-' || to_char(g.dia, 'YYYY') || '-' || lpad(g.seq::text, 4, '0'),
       g.status::service_orders_status_enum,
       s.name,
       CASE WHEN g.status = 'DELIVERED' THEN 'Servicio realizado; unidad entregada sin observaciones'
            WHEN g.status = 'WAITING_PARTS' THEN 'A la espera de refacción'
            ELSE 'En proceso en taller' END,
       v.mileage, g.mano, g.refa, 0, round((g.mano + g.refa) * 1.16, 2),
       g.received_at, g.promised_at,
       CASE WHEN g.status = 'DELIVERED' THEN g.delivered_at END,
       gen_random_uuid()
FROM (
  SELECT dia, seq,
         (SELECT hoy FROM ref) - dia AS dias_atras,
         CASE WHEN (SELECT hoy FROM ref) - dia > 2 THEN 'DELIVERED'
              ELSE (ARRAY['IN_PROGRESS','READY','WAITING_PARTS','RECEIVED'])[1 + (seq % 4)] END AS status,
         (450 + (seq % 8) * 180)::numeric AS mano,
         (350 + (seq % 10) * 220)::numeric AS refa,
         (dia + time '08:00' + ((seq % 8) || ' hours')::interval)  AS received_at,
         (dia + time '13:00' + ((seq % 5) || ' hours')::interval)  AS promised_at,
         (dia + time '15:00' + ((seq % 4) || ' hours')::interval)  AS delivered_at
  FROM (
    SELECT d::date AS dia, k, row_number() OVER (ORDER BY d, k) AS seq
    FROM generate_series((SELECT hoy FROM ref) - 89, (SELECT hoy FROM ref), interval '1 day') d
    CROSS JOIN generate_series(1, 8) k
    WHERE extract(dow FROM d) <> 0            -- sin domingos
  ) base
) g
JOIN t_veh  v ON v.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_veh))  + 1
JOIN t_mech m ON m.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_mech)) + 1
JOIN t_adv  a ON a.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_adv))  + 1
JOIN t_svc  s ON s.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_svc))  + 1;

-- Refacción consumida por cada orden entregada (una por orden).
INSERT INTO service_order_parts (service_order_id, part_id, quantity, unit_price, subtotal)
SELECT so.id, p.id, 1, p.public_price, p.public_price
FROM service_orders so
JOIN t_part p ON p.rn = (abs(hashtext(so.folio)) % (SELECT max(rn) FROM t_part)) + 1
WHERE so.tenant_id = (SELECT tenant_id FROM ref) AND so.status = 'DELIVERED';

-- Secuencia de folio al día.
INSERT INTO service_order_folio_seq (tenant_id, year, last_value)
SELECT (SELECT tenant_id FROM ref), extract(year FROM (SELECT hoy FROM ref))::int,
       (SELECT count(*) FROM service_orders WHERE tenant_id = (SELECT tenant_id FROM ref));

-- ── Citas: de -30 a +30 días, ~3/día hábil ───────────────────────────
INSERT INTO appointments (id, tenant_id, branch_id, client_id, vehicle_id, advisor_id,
                          origin, status, service_type, service_type_id,
                          client_name, client_phone, scheduled_at, duration_min, notes)
SELECT gen_random_uuid(), (SELECT tenant_id FROM ref), (SELECT matriz FROM ref),
       v.owner_id, v.id, a.id, 'INTERNAL',
       (CASE
          WHEN g.dia < (SELECT hoy FROM ref) THEN (ARRAY['COMPLETED','COMPLETED','NO_SHOW','CANCELLED'])[1 + (g.seq % 4)]
          WHEN g.dia = (SELECT hoy FROM ref) THEN (ARRAY['CONFIRMED','SCHEDULED'])[1 + (g.seq % 2)]
          ELSE (ARRAY['SCHEDULED','CONFIRMED','PENDING_CONFIRMATION'])[1 + (g.seq % 3)]
        END)::appointments_status_enum,
       s.name, s.id,
       coalesce(cl.company_name, cl.first_name || ' ' || cl.last_name), cl.phone,
       g.dia + time '09:00' + ((g.seq % 8) || ' hours')::interval, s.duration_min, NULL
FROM (
  SELECT d::date AS dia, k, row_number() OVER (ORDER BY d, k) AS seq
  FROM generate_series((SELECT hoy FROM ref) - 30, (SELECT hoy FROM ref) + 30, interval '1 day') d
  CROSS JOIN generate_series(1, 3) k
  WHERE extract(dow FROM d) <> 0
) g
JOIN t_veh v ON v.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_veh)) + 1
JOIN t_adv a ON a.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_adv)) + 1
JOIN t_svc s ON s.rn = ((g.seq - 1) % (SELECT max(rn) FROM t_svc)) + 1
JOIN clients cl ON cl.id = v.owner_id;

-- ── Códigos legibles de cliente (client_code) ────────────────────────
-- Los clientes se insertan por SQL sin código; la app normalmente lo genera.
-- Aquí se asignan con el formato prefijo + 'C' + consecutivo(8) y se ajusta la
-- secuencia document_code_seq, para que la lista muestre TDMC00000001, etc.
DO $$
DECLARE v_tenant uuid; v_prefix text; v_base int;
BEGIN
  SELECT id, COALESCE(NULLIF(trim(code_prefix), ''), 'XXX') INTO v_tenant, v_prefix
  FROM tenants WHERE slug = 'taller-demo';
  SELECT COALESCE(last_value, 0) INTO v_base
  FROM document_code_seq WHERE tenant_id = v_tenant AND object_code = 'C';
  IF v_base IS NULL THEN v_base := 0; END IF;
  WITH faltan AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
    FROM clients WHERE tenant_id = v_tenant AND (client_code IS NULL OR client_code = '')
  )
  UPDATE clients c
  SET client_number = v_base + f.n,
      client_code   = v_prefix || 'C' || lpad((v_base + f.n)::text, 8, '0')
  FROM faltan f WHERE c.id = f.id;
  INSERT INTO document_code_seq (tenant_id, object_code, last_value)
  VALUES (v_tenant, 'C', (SELECT COALESCE(max(client_number), 0) FROM clients WHERE tenant_id = v_tenant))
  ON CONFLICT (tenant_id, object_code) DO UPDATE SET last_value = EXCLUDED.last_value;
END $$;

COMMIT;

-- Resumen (informativo).
SELECT
  (SELECT count(*) FROM service_orders WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS ordenes,
  (SELECT count(*) FROM appointments  WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS citas,
  (SELECT count(*) FROM customer_vehicles WHERE tenant_id = (SELECT id FROM tenants WHERE slug='taller-demo')) AS vehiculos;
