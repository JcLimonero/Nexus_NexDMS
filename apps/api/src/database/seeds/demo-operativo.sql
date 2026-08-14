-- =====================================================================
-- Datos de demostración de un concesionario de motos.
--
-- Borra lo operativo y lo vuelve a sembrar coherente: los clientes tienen
-- vehículos, los vehículos tienen historial, las citas del día caen sobre
-- asesores que están en turno, las órdenes abiertas van por fases con
-- tiempos creíbles, y las refacciones que consume cada servicio existen en
-- el almacén —algunas por debajo del mínimo, para que la alerta de faltantes
-- tenga de qué avisar.
--
-- NO toca la organización ni el equipo: tenant, razón social, sucursales,
-- usuarios, roles, horarios y los catálogos que siembran las migraciones
-- (marcas, modelos, kits de servicio, fotos de recepción, planes del SaaS)
-- se quedan como están. Eso es configuración, no datos de prueba.
--
-- Las horas se escriben en hora local, que es como las guarda la aplicación
-- corriendo con TZ=America/Mexico_City.
--
--   docker compose exec -T postgres psql -U nexdms -d nexdms \
--     < apps/api/src/database/seeds/demo-operativo.sql
-- =====================================================================

BEGIN;

-- ── Referencias fijas ────────────────────────────────────────────────
CREATE TEMP TABLE ref AS
SELECT
  t.id                                              AS tenant_id,
  (SELECT id FROM branches WHERE slug = 'central')  AS central,
  (SELECT id FROM branches ORDER BY is_primary DESC, name OFFSET 1 LIMIT 1) AS norte,
  (SELECT id FROM users WHERE email = 'admin@demo.local')     AS admin,
  (SELECT id FROM users WHERE email = 'recepcion@demo.local') AS asesor1,
  (SELECT id FROM users WHERE email = 'asesor2@demo.local')   AS asesor2,
  (SELECT id FROM users WHERE email = 'asesor3@demo.local')   AS asesor3,
  (SELECT id FROM users WHERE email = 'mecanico1@demo.local') AS tecnico1,
  (SELECT id FROM users WHERE email = 'mecanico2@demo.local') AS tecnico2,
  (SELECT id FROM users WHERE email = 'mecanico3@demo.local') AS tecnico3,
  (now() AT TIME ZONE 'America/Mexico_City')::date  AS hoy
FROM tenants t
WHERE t.slug = 'demo';

-- ── Limpieza de lo operativo ─────────────────────────────────────────
-- El orden va de lo más dependiente a lo menos; las llaves con ON DELETE
-- CASCADE harían casi todo solas, pero dejarlo explícito documenta qué se
-- borra y evita sorpresas si mañana alguna deja de ser en cascada.
DELETE FROM notification_logs;
DELETE FROM service_order_times;
DELETE FROM service_order_operations;
DELETE FROM service_order_findings;
DELETE FROM service_order_updates;
DELETE FROM service_order_parts;
DELETE FROM service_order_phases;
DELETE FROM service_surveys;
DELETE FROM reception_photo_marks;
DELETE FROM reception_photos;
DELETE FROM reception_checklists;
DELETE FROM document_signatures;
DELETE FROM portal_messages;
DELETE FROM portal_users;
DELETE FROM service_orders;
DELETE FROM service_order_folio_seq;
DELETE FROM appointments;
DELETE FROM quotation_items;
DELETE FROM quotations;
DELETE FROM quotation_folio_seq;
DELETE FROM lead_activities;
DELETE FROM leads;
DELETE FROM unit_sale_accessories;
DELETE FROM unit_accessory_compatibilities;
DELETE FROM unit_accessories;
DELETE FROM payment_plan_installments;
DELETE FROM payment_plans;
DELETE FROM sale_payments;
DELETE FROM unit_sales;
DELETE FROM used_unit_intakes;
DELETE FROM receivable_payments;
DELETE FROM receivables;
DELETE FROM payable_payments;
DELETE FROM payables;
DELETE FROM pld_operations;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM cash_sessions;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM contacts;
DELETE FROM catalog_units;
DELETE FROM stock_movements;
DELETE FROM stock_locations;
DELETE FROM part_categories;
DELETE FROM suppliers;
DELETE FROM warranties;
DELETE FROM service_type_parts;
DELETE FROM service_types;
DELETE FROM stock_movements;
DELETE FROM parts;
DELETE FROM vehicle_ownerships;
DELETE FROM customer_vehicles;
DELETE FROM clients;
DELETE FROM saas_payments;

-- ── Clientes ─────────────────────────────────────────────────────────
-- Ocho particulares y dos empresas: las empresas son las que mueven flota
-- y justifican varias unidades del mismo dueño.
INSERT INTO clients (id, tenant_id, client_type, is_company, first_name, last_name,
                     company_name, rfc, phone, email, address, city, state, fixed_discount)
SELECT gen_random_uuid(), r.tenant_id, c.tipo::clients_client_type_enum, c.empresa,
       c.nombre, c.apellido, c.razon, c.rfc, c.tel, c.correo, c.dir, 'Ciudad de México', 'CDMX', c.desc_fijo
FROM ref r, (VALUES
  ('INDIVIDUAL', false, 'Laura',   'Mendoza Rivas',  NULL, 'MERL880412H23', '5551002030', 'laura.mendoza@correo.mx', 'Av. Universidad 450, Del Valle', 0),
  ('INDIVIDUAL', false, 'Roberto', 'Silva Ortega',   NULL, 'SIOR751130KL8', '5551002031', 'roberto.silva@correo.mx', 'Calle Pino 22, Coyoacán', 0),
  ('INDIVIDUAL', false, 'Patricia','Ibarra Luna',    NULL, 'IALP920825RT4', '5551002032', 'patricia.ibarra@correo.mx', 'Insurgentes Sur 1200, Nápoles', 0),
  ('INDIVIDUAL', false, 'Miguel',  'Rojas Cabrera',  NULL, 'ROCM840617PP1', '5551002033', 'miguel.rojas@correo.mx', 'Eje Central 88, Doctores', 0),
  ('INDIVIDUAL', false, 'Ana',     'Ruiz Vega',      NULL, 'RUVA900203GH6', '5551002034', 'ana.ruiz@correo.mx', 'Calz. de Tlalpan 900, Portales', 0),
  ('INDIVIDUAL', false, 'Jorge',   'Hernández Paz',  NULL, 'HEPJ870914BN2', '5551002035', 'jorge.hernandez@correo.mx', 'Av. Revolución 315, Mixcoac', 0),
  ('INDIVIDUAL', false, 'Claudia', 'Ramos Beltrán',  NULL, 'RABC950728DF3', '5551002036', 'claudia.ramos@correo.mx', 'Río Churubusco 77, Iztacalco', 0),
  ('INDIVIDUAL', false, 'Fernando','Nava Estrada',   NULL, 'NAEF821005QW9', '5551002037', 'fernando.nava@correo.mx', 'Anillo Periférico 4000, Pedregal', 0),
  ('BUSINESS',   true,  NULL, NULL, 'Mensajería Rápida del Centro SA de CV', 'MRC180322TY5', '5551002040', 'flotilla@mensajeriarapida.mx', 'Calz. Vallejo 1200, Azcapotzalco', 8),
  ('BUSINESS',   true,  NULL, NULL, 'Distribuidora Ferretera del Bajío SA',  'DFB150710UI7', '5551002041', 'compras@ferreterabajio.mx', 'Av. Central 55, Iztapalapa', 5)
) AS c(tipo, empresa, nombre, apellido, razon, rfc, tel, correo, dir, desc_fijo);

-- ── Vehículos ────────────────────────────────────────────────────────
-- Motos de calle y de reparto. La flota de la mensajería son tres Cargo 150,
-- que es lo que se ve en un concesionario que atiende empresas.
INSERT INTO customer_vehicles (id, tenant_id, owner_id, vehicle_type, make, model, year,
                               color, plate, vin, mileage)
SELECT gen_random_uuid(), r.tenant_id,
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = v.dueno LIMIT 1),
       'MOTORCYCLE', v.marca, v.modelo, v.anio, v.color, v.placa, v.vin, v.km
FROM ref r, (VALUES
  ('Mendoza Rivas',  'Honda',   'CB500F',    2024, 'Rojo',    'NGZ-4401', '3H1JC6110RD200145', 8420),
  ('Silva Ortega',   'Honda',   'CB190R',    2023, 'Negro',   'MPT-2210', '3H1KC1820PD100322', 15380),
  ('Ibarra Luna',    'Honda',   'XR150L',    2025, 'Blanco',  'RTS-8890', '3H1KD0810SD300871', 3140),
  ('Rojas Cabrera',  'Italika', 'FT150',     2024, 'Azul',    'JKL-5512', 'LXYJCML05RA045512', 11250),
  ('Ruiz Vega',      'Honda',   'CB500F',    2022, 'Gris',    'QWE-3344', '3H1JC6110ND199033', 24680),
  ('Hernández Paz',  'Honda',   'Cargo 150', 2023, 'Blanco',  'ZXC-1188', '3H1KE0910PD400218', 31900),
  ('Ramos Beltrán',  'Honda',   'XR150L',    2024, 'Rojo',    'BNM-7766', '3H1KD0810RD298744', 6710),
  ('Nava Estrada',   'Honda',   'CB190R',    2025, 'Verde',   'POI-9922', '3H1KC1820SD155390', 1890),
  ('Mensajería Rápida del Centro SA de CV', 'Honda', 'Cargo 150', 2024, 'Blanco', 'FLT-1001', '3H1KE0910RD401001', 42300),
  ('Mensajería Rápida del Centro SA de CV', 'Honda', 'Cargo 150', 2024, 'Blanco', 'FLT-1002', '3H1KE0910RD401002', 38750),
  ('Mensajería Rápida del Centro SA de CV', 'Honda', 'Cargo 150', 2025, 'Blanco', 'FLT-1003', '3H1KE0910SD401003', 12400),
  ('Distribuidora Ferretera del Bajío SA',  'Honda', 'Cargo 150', 2023, 'Azul',   'FER-2001', '3H1KE0910PD402001', 28150)
) AS v(dueno, marca, modelo, anio, color, placa, vin, km);

-- ── Historial de propiedad ───────────────────────────────────────────
-- Todos arrancan con su dueño actual desde su alta.
INSERT INTO vehicle_ownerships (tenant_id, vehicle_id, client_id, from_date, source, notes)
SELECT r.tenant_id, v.id, v.owner_id, r.hoy - 400, 'ALTA',
       'Dueño registrado al dar de alta el vehículo'
FROM ref r, customer_vehicles v;

-- La CB500F 2022 de Ana Ruiz venía de Jorge Hernández: es el caso que hace
-- visible el historial —sus servicios viejos no son de la dueña de hoy.
UPDATE vehicle_ownerships o
   SET from_date = (SELECT hoy - 95 FROM ref)
 WHERE o.vehicle_id = (SELECT id FROM customer_vehicles WHERE plate = 'QWE-3344');

INSERT INTO vehicle_ownerships (tenant_id, vehicle_id, client_id, from_date, to_date, source, notes)
SELECT r.tenant_id,
       (SELECT id FROM customer_vehicles WHERE plate = 'QWE-3344'),
       (SELECT id FROM clients WHERE last_name = 'Hernández Paz'),
       r.hoy - 690, r.hoy - 95, 'MANUAL', 'Vendida a Ana Ruiz'
FROM ref r;

-- ── Almacén: categorías, ubicaciones y proveedores ───────────────────
-- Sin esto las refacciones son una lista plana: no se pueden filtrar por
-- familia ni se sabe de qué anaquel bajarlas.
INSERT INTO part_categories (id, tenant_id, name, description, is_active)
SELECT gen_random_uuid(), r.tenant_id, c.nombre, c.descr, true
FROM ref r, (VALUES
  ('Lubricantes',   'Aceites y líquidos'),
  ('Filtros',       'Aceite, aire y gasolina'),
  ('Frenos',        'Balatas, discos y líquidos'),
  ('Transmisión',   'Cadenas, catarinas y piñones'),
  ('Llantas',       'Delanteras y traseras'),
  ('Eléctrico',     'Baterías, focos y bujías'),
  ('Motor',         'Empaques y componentes internos'),
  ('Carrocería',    'Espejos, escapes y cubiertas')
) AS c(nombre, descr);

INSERT INTO stock_locations (id, tenant_id, branch_id, code, zone, aisle, shelf, level, description, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.central, u.codigo, u.zona, u.pasillo, u.anaquel, u.nivel, u.descr, true
FROM ref r, (VALUES
  ('A-01-1', 'Almacén', 'A', '01', '1', 'Lubricantes a granel'),
  ('A-02-1', 'Almacén', 'A', '02', '1', 'Filtros'),
  ('B-01-2', 'Almacén', 'B', '01', '2', 'Frenos'),
  ('B-03-1', 'Almacén', 'B', '03', '1', 'Transmisión'),
  ('C-01-1', 'Almacén', 'C', '01', '1', 'Llantas'),
  ('D-02-3', 'Almacén', 'D', '02', '3', 'Eléctrico y menudeo')
) AS u(codigo, zona, pasillo, anaquel, nivel, descr);

INSERT INTO suppliers (id, tenant_id, name, contact_name, phone, email, rfc, payment_terms, credit_days, is_active)
SELECT gen_random_uuid(), r.tenant_id, p.nombre, p.contacto, p.tel, p.correo, p.rfc, p.terminos, p.dias, true
FROM ref r, (VALUES
  ('Refaccionaria Central de Motos SA', 'Ing. Óscar Medina', '5552001010', 'ventas@refaccionariacentral.mx', 'RCM090812AB4', 'CREDITO', 30),
  ('Distribuidora Honda Nacional',      'Lic. Marcela Ponce','5552001011', 'pedidos@hondanacional.mx',      'DHN050303CD7', 'CREDITO', 45),
  ('Llantas y Rines del Valle',         'Sr. Julio Ramírez', '5552001012', 'mostrador@llantasvalle.mx',     'LRV120620EF9', 'CONTADO',  0),
  ('Lubricantes Industriales del Norte','Ing. Paola Cruz',   '5552001013', 'contacto@lubrinorte.mx',        'LIN140505GH2', 'CREDITO', 15)
) AS p(nombre, contacto, tel, correo, rfc, terminos, dias);

-- ── Refacciones ──────────────────────────────────────────────────────
-- Precios de mostrador de motocicleta. Dos quedan por debajo del mínimo a
-- propósito: el filtro de aire en cero y las balatas traseras al límite.
INSERT INTO parts (id, tenant_id, branch_id, category_id, location_id, sku, name,
                   description, vehicle_type, unit_of_measure, purchase_price,
                   public_price, wholesale_price, business_price,
                   stock_quantity, min_stock, max_stock, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM part_categories WHERE name = p.familia),
       (SELECT id FROM stock_locations WHERE code = p.ubicacion),
       p.sku, p.nombre, p.descr, 'MOTORCYCLE',
       p.unidad, p.compra, p.publico, p.mayoreo, p.empresa, p.stock, p.minimo, p.maximo, true
FROM ref r, (VALUES
  ('ACE-10W40', 'Aceite 10W-40 mineral (litro)', 'Para motor de 4 tiempos', 'LITRO', 92,  165, 148, 140, 48, 12, 80, 'Lubricantes', 'A-01-1'),
  ('ACE-20W50', 'Aceite 20W-50 semisintético (litro)', 'Alta temperatura', 'LITRO', 118, 210, 189, 178, 26, 10, 60, 'Lubricantes', 'A-01-1'),
  ('FIL-ACE',   'Filtro de aceite', 'CB/XR/Cargo', 'PIEZA', 68,  135, 121, 115, 22, 8,  40, 'Filtros', 'A-02-1'),
  ('FIL-AIRE',  'Filtro de aire', 'CB190R / XR150L', 'PIEZA', 145, 285, 256, 242, 0,  6,  30, 'Filtros', 'A-02-1'),
  ('BUJ-CR8',   'Bujía NGK CR8E', 'Estándar', 'PIEZA', 78,  155, 139, 132, 34, 12, 60, 'Eléctrico', 'D-02-3'),
  ('BAL-DEL',   'Balatas delanteras', 'Juego', 'JUEGO', 210, 420, 378, 357, 14, 6,  30, 'Frenos', 'B-01-2'),
  ('BAL-TRA',   'Balatas traseras', 'Juego', 'JUEGO', 185, 370, 333, 315, 5,  6,  30, 'Frenos', 'B-01-2'),
  ('KIT-ARR',   'Kit de arrastre completo', 'Catarina, piñón y cadena', 'JUEGO', 890, 1650, 1485, 1402, 9,  4,  20, 'Transmisión', 'B-03-1'),
  ('CAD-428',   'Cadena 428H x 122', 'Reforzada', 'PIEZA', 320, 610, 549, 518, 12, 5,  25, 'Transmisión', 'B-03-1'),
  ('LLA-DEL',   'Llanta delantera 90/90-19', 'Uso mixto', 'PIEZA', 640, 1180, 1062, 1003, 8,  4,  20, 'Llantas', 'C-01-1'),
  ('LLA-TRA',   'Llanta trasera 110/90-17', 'Uso mixto', 'PIEZA', 720, 1320, 1188, 1122, 7,  4,  20, 'Llantas', 'C-01-1'),
  ('BAT-YTX7',  'Batería YTX7L-BS', '12V 6Ah', 'PIEZA', 480, 890, 801, 756, 11, 4,  20, 'Eléctrico', 'D-02-3'),
  ('LIQ-FRE',   'Líquido de frenos DOT-4 (355 ml)', NULL, 'PIEZA', 95,  190, 171, 161, 18, 6,  30, 'Frenos', 'B-01-2'),
  ('FOC-H4',    'Foco halógeno H4', 'Faro principal', 'PIEZA', 85,  175, 158, 149, 16, 6,  30, 'Eléctrico', 'D-02-3'),
  ('CAB-EMB',   'Cable de embrague', 'CB190R', 'PIEZA', 130, 265, 239, 225, 9,  4,  20, 'Carrocería', 'D-02-3'),
  ('ESP-JUEGO', 'Espejos laterales (par)', 'Universal rosca 10mm', 'JUEGO', 175, 340, 306, 289, 13, 4,  20, 'Carrocería', 'D-02-3'),
  ('EMP-CUL',   'Empaque de culata', 'CB/XR 150-190', 'PIEZA', 110, 225, 203, 191, 7,  3,  15, 'Motor', 'D-02-3'),
  ('SIL-ESC',   'Silenciador de escape', 'Original', 'PIEZA', 1450, 2680, 2412, 2278, 3,  2,  10, 'Carrocería', 'D-02-3')
) AS p(sku, nombre, descr, unidad, compra, publico, mayoreo, empresa, stock, minimo, maximo, familia, ubicacion);

-- ── Tipos de servicio ────────────────────────────────────────────────
INSERT INTO service_types (id, tenant_id, branch_id, code, name, description, category,
                           duration_min, requires_ramp, ramp_duration_min,
                           recurrence_km_interval, recurrence_months_interval, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.central, s.codigo, s.nombre, s.descr,
       s.cat::service_types_category_enum, s.dur, s.rampa, s.dur_rampa, s.km, s.meses, true
FROM ref r, (VALUES
  ('MTTO-1K',  'Servicio de 1,000 km',  'Primer servicio: aceite, ajustes y revisión general', 'MAINTENANCE', 60,  true,  45, 1000,  2),
  ('MTTO-5K',  'Servicio de 5,000 km',  'Aceite, filtro y puntos de seguridad',                'MAINTENANCE', 75,  true,  60, 5000,  6),
  ('MTTO-10K', 'Servicio de 10,000 km', 'Aceite, filtros, bujía y kit de arrastre',            'MAINTENANCE', 120, true,  90, 10000, 12),
  ('FRENOS',   'Cambio de balatas',     'Delanteras o traseras, con purga',                    'REPAIR',      60,  true,  45, NULL,  NULL),
  ('DIAG',     'Diagnóstico',           'Revisión con el cliente presente',                    'DIAGNOSIS',   45,  false, NULL, NULL, NULL)
) AS s(codigo, nombre, descr, cat, dur, rampa, dur_rampa, km, meses);

-- Qué consume cada servicio. Es lo que alimenta la alerta al agendar: el
-- de 10,000 km pide filtro de aire, que está en cero.
INSERT INTO service_type_parts (service_type_id, part_id, quantity_required)
SELECT st.id, p.id, x.cant
FROM (VALUES
  ('MTTO-1K',  'ACE-10W40', 1),
  ('MTTO-1K',  'FIL-ACE',   1),
  ('MTTO-5K',  'ACE-10W40', 1),
  ('MTTO-5K',  'FIL-ACE',   1),
  ('MTTO-5K',  'BUJ-CR8',   1),
  ('MTTO-10K', 'ACE-20W50', 1),
  ('MTTO-10K', 'FIL-ACE',   1),
  ('MTTO-10K', 'FIL-AIRE',  1),
  ('MTTO-10K', 'BUJ-CR8',   1),
  ('MTTO-10K', 'KIT-ARR',   1),
  ('FRENOS',   'BAL-DEL',   1),
  ('FRENOS',   'LIQ-FRE',   1)
) AS x(codigo, sku, cant)
JOIN service_types st ON st.code = x.codigo
JOIN parts p          ON p.sku   = x.sku;

-- ── Accesorios ───────────────────────────────────────────────────────
INSERT INTO unit_accessories (id, tenant_id, name, sku, price, description, category,
                              is_universal, is_active)
SELECT gen_random_uuid(), r.tenant_id, a.nombre, a.sku, a.precio, a.descr, a.familia,
       a.universal, true
FROM ref r, (VALUES
  ('Barras porta equipaje', 'ACC-BARRAS', 2450, 'Acero, para caja o maleta',        'Transporte',  true),
  ('Casco integral certificado', 'ACC-CASCO', 1890, 'Talla M/L, con visera',        'Seguridad',   true),
  ('Candado de disco con alarma', 'ACC-CANDADO', 780, '110 dB',                     'Seguridad',   true),
  ('Top case 45 litros',    'ACC-TOPCASE', 3200, 'Con base universal',              'Transporte',  true),
  ('Protector de motor',    'ACC-SLIDER', 1450, 'Tubular, específico por modelo',   'Protección',  false),
  ('Parabrisas alto',       'ACC-PARAB', 2100, 'Acrílico, específico por modelo',   'Confort',     false)
) AS a(nombre, sku, precio, descr, familia, universal);

-- Los específicos se atan a los modelos del catálogo global que existan.
INSERT INTO unit_accessory_compatibilities (accessory_id, global_model_id)
SELECT a.id, gm.id
FROM unit_accessories a
CROSS JOIN LATERAL (
  SELECT id FROM global_models ORDER BY created_at LIMIT 3
) gm
WHERE a.is_universal = false;

-- ── Citas ────────────────────────────────────────────────────────────
-- La agenda de hoy: las de la mañana ya se atendieron, una no llegó, y las
-- de la tarde siguen esperándose. Repartidas entre los tres asesores, que
-- es lo que hace que el tablero por asesor tenga sentido.
INSERT INTO appointments (id, tenant_id, branch_id, client_id, vehicle_id, advisor_id,
                          origin, status, service_type, service_type_id,
                          client_name, client_phone, scheduled_at, duration_min, notes)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       c.id, v.id,
       CASE a.asesor WHEN 1 THEN r.asesor1 WHEN 2 THEN r.asesor2 ELSE r.asesor3 END,
       'INTERNAL', a.estado::appointments_status_enum, a.servicio,
       (SELECT id FROM service_types WHERE code = a.codigo),
       coalesce(c.company_name, c.first_name || ' ' || c.last_name), c.phone,
       r.hoy + a.hora::time, a.dur, a.nota
FROM ref r, (VALUES
  ('NGZ-4401', 'COMPLETED', 'Servicio de 5,000 km',  'MTTO-5K',  '08:30', 75,  1, 'Llegó puntual'),
  ('MPT-2210', 'COMPLETED', 'Cambio de balatas',     'FRENOS',   '09:00', 60,  2, 'Ruido al frenar'),
  ('JKL-5512', 'NO_SHOW',   'Diagnóstico',           'DIAG',     '09:30', 45,  3, 'No se presentó; se le llamó sin respuesta'),
  ('RTS-8890', 'COMPLETED', 'Servicio de 1,000 km',  'MTTO-1K',  '10:00', 60,  1, 'Primer servicio'),
  ('FLT-1001', 'CONFIRMED', 'Servicio de 10,000 km', 'MTTO-10K', '12:00', 120, 2, 'Flotilla: recoge el mismo día'),
  ('BNM-7766', 'SCHEDULED', 'Servicio de 5,000 km',  'MTTO-5K',  '13:30', 75,  3, NULL),
  ('ZXC-1188', 'SCHEDULED', 'Cambio de balatas',     'FRENOS',   '16:00', 60,  1, 'Trae las balatas de repuesto'),
  ('POI-9922', 'SCHEDULED', 'Servicio de 1,000 km',  'MTTO-1K',  '17:00', 60,  2, NULL)
) AS a(placa, estado, servicio, codigo, hora, dur, asesor, nota)
JOIN customer_vehicles v ON v.plate = a.placa
JOIN clients c           ON c.id = v.owner_id;

-- Y algo de agenda futura, para que el calendario no se vea vacío mañana.
INSERT INTO appointments (id, tenant_id, branch_id, client_id, vehicle_id, advisor_id,
                          origin, status, service_type, service_type_id,
                          client_name, client_phone, scheduled_at, duration_min)
SELECT gen_random_uuid(), r.tenant_id, r.central, c.id, v.id, r.asesor1,
       'INTERNAL', 'SCHEDULED', 'Servicio de 5,000 km',
       (SELECT id FROM service_types WHERE code = 'MTTO-5K'),
       coalesce(c.company_name, c.first_name || ' ' || c.last_name), c.phone,
       r.hoy + a.dias + a.hora::time, 75
FROM ref r, (VALUES
  ('FLT-1002', 1, '09:00'),
  ('FER-2001', 1, '11:00'),
  ('QWE-3344', 2, '10:00'),
  ('FLT-1003', 3, '08:30')
) AS a(placa, dias, hora)
JOIN customer_vehicles v ON v.plate = a.placa
JOIN clients c           ON c.id = v.owner_id;

-- ── Órdenes de servicio ──────────────────────────────────────────────
-- Cinco en el taller ahora mismo y dos entregadas. Las abiertas son las que
-- llenan el magneto plano; las entregadas dan historial al vehículo y al
-- cliente, que es lo que hace creíble la ficha.
INSERT INTO service_order_folio_seq (tenant_id, year, last_value)
SELECT tenant_id, extract(year FROM hoy)::int, 7 FROM ref;

INSERT INTO service_orders (id, tenant_id, branch_id, owner_id, vehicle_id, user_id,
                            mechanic_id, folio, status, reported_fault, diagnosis,
                            km_in, labor_cost, parts_cost, discount, total,
                            received_at, promised_at, delivered_at, tracking_token)
SELECT gen_random_uuid(), r.tenant_id, r.central, v.owner_id, v.id, r.asesor1,
       CASE o.tecnico WHEN 1 THEN r.tecnico1 WHEN 2 THEN r.tecnico2 ELSE r.tecnico3 END,
       o.folio, o.estado::service_orders_status_enum, o.falla, o.diagnostico,
       v.mileage, o.mano_obra, o.refacciones, 0,
       round((o.mano_obra + o.refacciones) * 1.16, 2),
       r.hoy + o.recibida::time - (o.dias_atras || ' days')::interval,
       r.hoy + o.prometida::time - (o.dias_atras || ' days')::interval,
       CASE WHEN o.estado = 'DELIVERED'
            THEN r.hoy + o.prometida::time - (o.dias_atras || ' days')::interval
            END,
       gen_random_uuid()
FROM ref r, (VALUES
  ('OS-2026-0001', 'NGZ-4401', 'IN_PROGRESS',   'Servicio de 5,000 km',              'Aceite y filtro; frenos en buen estado', 850,  480,  1, '08:30', '13:00', 0),
  ('OS-2026-0002', 'MPT-2210', 'IN_PROGRESS',   'Rechinido al frenar de frente',      'Balatas delanteras al límite',           600,  610,  2, '09:05', '14:00', 0),
  ('OS-2026-0003', 'RTS-8890', 'IN_PROGRESS',   'Primer servicio de 1,000 km',        'Ajustes de fábrica',                     450,  300,  3, '10:10', '12:30', 0),
  ('OS-2026-0004', 'FLT-1001', 'WAITING_PARTS', 'Servicio de 10,000 km de flotilla',  'Falta filtro de aire en almacén',        1200, 2100, 1, '11:00', '18:00', 0),
  ('OS-2026-0005', 'QWE-3344', 'READY',         'Cambio de kit de arrastre',          'Cadena estirada y catarina desgastada',  900,  1650, 2, '08:00', '15:00', 1),
  ('OS-2026-0006', 'ZXC-1188', 'DELIVERED',     'Servicio de 10,000 km',              'Completo, sin observaciones',            1200, 1980, 3, '09:00', '17:00', 6),
  ('OS-2026-0007', 'JKL-5512', 'DELIVERED',     'Falla intermitente de encendido',    'Bujía sulfatada; se reemplazó',          400,  155,  1, '10:00', '13:00', 12)
) AS o(folio, placa, estado, falla, diagnostico, mano_obra, refacciones, tecnico, recibida, prometida, dias_atras)
JOIN customer_vehicles v ON v.plate = o.placa;

-- Refacciones consumidas por las órdenes ya cerradas.
INSERT INTO service_order_parts (service_order_id, part_id, quantity, unit_price, subtotal)
SELECT so.id, p.id, x.cant, p.public_price, p.public_price * x.cant
FROM (VALUES
  ('OS-2026-0005', 'KIT-ARR',   1),
  ('OS-2026-0006', 'ACE-20W50', 1),
  ('OS-2026-0006', 'FIL-ACE',   1),
  ('OS-2026-0006', 'BUJ-CR8',   1),
  ('OS-2026-0007', 'BUJ-CR8',   1)
) AS x(folio, sku, cant)
JOIN service_orders so ON so.folio = x.folio
JOIN parts p           ON p.sku    = x.sku;

-- ── Fases de las órdenes abiertas ────────────────────────────────────
-- Se copian del paquete que corresponde y se les da tiempo real: una va
-- holgada, otra al filo y otra pasada, para que el semáforo del tablero
-- muestre los tres estados sin tener que esperar a que ocurran.
INSERT INTO service_order_phases (service_order_id, kit_phase_id, sequence, name,
                                  estimated_min, role, assigned_user_id, status,
                                  started_at, finished_at)
SELECT so.id, kp.id, kp.sequence, kp.name, kp.estimated_min, kp.role,
       -- Todas las fases de una orden van al mismo técnico: en un taller de
       -- este tamaño quien la abre la lleva hasta la entrega, incluido bajar
       -- por las refacciones. El carril de "sin asignar" del tablero queda
       -- para cuando de verdad falta asignar a alguien.
       so.mechanic_id,
       CASE
         WHEN kp.sequence < f.fase_actual THEN 'TERMINADA'
         WHEN kp.sequence = f.fase_actual THEN 'EN_CURSO'
         ELSE 'PENDIENTE'
       END,
       CASE
         WHEN kp.sequence < f.fase_actual
           THEN so.received_at + ((kp.sequence - 1) * 40 || ' minutes')::interval
         WHEN kp.sequence = f.fase_actual
           THEN (now() AT TIME ZONE 'America/Mexico_City') - (f.lleva_min || ' minutes')::interval
       END,
       CASE
         -- Las cerradas tardan algo menos de su estimado: si se les diera
         -- una duración fija saldrían todas en rojo por comparar contra
         -- baremos distintos.
         WHEN kp.sequence < f.fase_actual
           THEN so.received_at + ((kp.sequence - 1) * 40
                                  + round(kp.estimated_min * 0.9) || ' minutes')::interval
       END
FROM (VALUES
  -- folio, kit que se le aplicó, fase en curso, minutos que lleva
  -- Los minutos van elegidos contra el estimado de esa fase concreta para
  -- que el tablero abra mostrando los tres colores del semáforo.
  ('OS-2026-0001', 'AFIN-MAY', 3, 25),   -- 25 de 108: en tiempo
  ('OS-2026-0002', 'FRENOS-D', 3, 62),   -- 62 de 36: excedida
  ('OS-2026-0003', 'DIAG',     3, 33)    -- 33 de 36: por vencer
) AS f(folio, kit, fase_actual, lleva_min)
JOIN service_orders so   ON so.folio = f.folio
JOIN service_kits k      ON k.code   = f.kit
JOIN service_kit_phases kp ON kp.kit_id = k.id;

-- ── Cobros del SaaS ──────────────────────────────────────────────────
-- Seis meses de historial para que la ficha del cliente en el portal de
-- administración muestre algo más que un mes suelto.
INSERT INTO saas_payments (tenant_id, period, amount, status, due_date, paid_at,
                           method, reference, concept)
SELECT r.tenant_id,
       to_char((r.hoy - (n || ' months')::interval), 'YYYY-MM'),
       5900,
       CASE WHEN n = 0 THEN 'PENDIENTE' ELSE 'PAGADO' END,
       date_trunc('month', r.hoy - (n || ' months')::interval)::date + 4,
       CASE WHEN n > 0
            THEN date_trunc('month', r.hoy - (n || ' months')::interval) + interval '3 days'
            END,
       CASE WHEN n > 0 THEN 'TRANSFERENCIA' END,
       CASE WHEN n > 0 THEN 'SPEI-' || (48200 + n * 37) END,
       'Suscripción ' || to_char((r.hoy - (n || ' months')::interval), 'TMMonth YYYY')
FROM ref r, generate_series(0, 5) AS n;

-- ── Prospectos ───────────────────────────────────────────────────────
-- El estatus lo define el backend en inglés (NEW, CONTACTED, QUALIFIED,
-- OPPORTUNITY, WON, LOST). Con los nombres en español las tarjetas existían
-- pero no caían en ninguna columna del tablero: el pipeline salía en cero.
-- Se cubre toda la fila para que el embudo se lea de un vistazo.
INSERT INTO leads (id, tenant_id, branch_id, name, phone, email, source, interest, status, assigned_to, client_id, created_at)
SELECT gen_random_uuid(), r.tenant_id, r.central, l.nombre, l.tel, l.correo,
       l.origen, l.interes, l.estado, r.asesor1,
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = l.cliente),
       (now() AT TIME ZONE 'America/Mexico_City') - (l.dias || ' days')::interval
FROM ref r, (VALUES
  ('Sofía Delgado Marín',  '5551003001', 'sofia.delgado@correo.mx',  'PORTAL',    'XR150L 2026, pregunta por financiamiento',   'NEW',         NULL, 2),
  ('Grupo Logístico Sur',  '5551003004', 'compras@logisticosur.mx',  'REFERIDO',  'Flotilla de cinco Cargo 150',                'NEW',         NULL, 1),
  ('Raúl Ibáñez Cortés',   '5551003002', 'raul.ibanez@correo.mx',    'PISO',      'XR150L para trabajo de campo',               'CONTACTED',   NULL, 6),
  ('Verónica Palma Ruiz',  '5551003003', 'veronica.palma@correo.mx', 'TELEFONO',  'Dos Cargo 150 para reparto',                 'QUALIFIED',   NULL, 9),
  ('Ernesto Salas Ibarra', '5551003005', 'ernesto.salas@correo.mx',  'PORTAL',    'CB500F 2026, ya probó la unidad',            'OPPORTUNITY', NULL, 12),
  ('Claudia Ramos Beltrán','5551002036', 'claudia.ramos@correo.mx',  'PISO',      'XR150L 2026 — cerrada, entregada',           'WON',         'Ramos Beltrán', 45),
  ('Tomás Vera Zúñiga',    '5551003006', 'tomas.vera@correo.mx',     'TELEFONO',  'Comparó contra otra marca y no volvió',      'LOST',        NULL, 30)
) AS l(nombre, tel, correo, origen, interes, estado, cliente, dias);

-- ── Inventario de unidades ───────────────────────────────────────────
-- Piso de venta: lo que hay disponible, lo apartado y lo ya vendido. Sin
-- unidades el módulo de ventas no tiene de dónde partir, y los accesorios
-- por modelo no tienen a qué aplicarse.
INSERT INTO catalog_units (id, tenant_id, branch_id, global_model_id, vehicle_type,
                           brand, model, year, version, color, serial_number,
                           engine_number, displacement, cost_price, list_price,
                           sale_price, status, condition_type, acquisition_date)
SELECT gen_random_uuid(), r.tenant_id, r.central, gm.id, 'MOTORCYCLE',
       u.marca, u.modelo, u.anio, gm.version, u.color, u.serie, u.motor, u.cc,
       u.costo, u.lista, u.venta, u.estado::catalog_units_status_enum,
       u.condicion::catalog_units_condition_type_enum, r.hoy - u.dias_en_piso
FROM ref r, (VALUES
  ('Honda', 'CB500F',    2026, 'Rojo',   '3H1JC6110TD500101', 'PC58E5100101', 471, 118000, 139900, 139900, 'AVAILABLE', 'NEW',  35),
  ('Honda', 'CB500F',    2026, 'Negro',  '3H1JC6110TD500102', 'PC58E5100102', 471, 118000, 139900, 139900, 'AVAILABLE', 'NEW',  35),
  ('Honda', 'XR150L',    2026, 'Azul',   '3H1KD0810TD500201', 'KD08E5100201', 149, 41000,  51900,  51900,  'AVAILABLE', 'NEW',  22),
  ('Honda', 'Cargo 150', 2026, 'Rojo',   '3H1KE0910TD500202', 'KE09E5100202', 149, 39000,  48900,  47500,  'RESERVED',  'NEW',  22),
  ('Honda', 'XR150L',    2026, 'Blanco', '3H1KD0810TD500301', 'KD08E5100301', 149, 41000,  51900,  51900,  'AVAILABLE', 'NEW',  14),
  ('Honda', 'XR150L',    2026, 'Rojo',   '3H1KD0810TD500302', 'KD08E5100302', 149, 41000,  51900,  49900,  'SOLD',      'NEW',  48),
  ('Honda', 'Cargo 150', 2026, 'Blanco', '3H1KE0910TD500401', 'KE09E5100401', 149, 39000,  48900,  48900,  'AVAILABLE', 'NEW',  9),
  ('Honda', 'Cargo 150', 2026, 'Blanco', '3H1KE0910TD500402', 'KE09E5100402', 149, 39000,  48900,  46900,  'SOLD',      'NEW',  60),
  ('Honda', 'Cargo 150', 2026, 'Azul',   '3H1KE0910TD500403', 'KE09E5100403', 149, 39000,  48900,  48900,  'AVAILABLE', 'NEW',  9),
  ('Italika','FT150',    2026, 'Negro',  'LXYJCML05TA050501',  'FT15E5100501', 149, 21000,  27900,  27900,  'AVAILABLE', 'NEW',  27),
  ('Honda', 'CB500F',    2023, 'Gris',   '3H1JC6110PD180901', 'PC58E1800901', 471, 78000,  99900,  99900,  'AVAILABLE', 'USED', 18),
  ('Honda', 'XR150L',    2023, 'Negro',  '3H1KD0810PD150902', 'KD08E1500902', 149, 29000,  39900,  39900,  'AVAILABLE', 'USED', 41)
) AS u(marca, modelo, anio, color, serie, motor, cc, costo, lista, venta, estado, condicion, dias_en_piso)
JOIN global_brands gb ON gb.name = u.marca
JOIN global_models gm ON gm.brand_id = gb.id AND gm.model = u.modelo;

-- El JOIN de arriba descarta en silencio cualquier unidad cuyo modelo no
-- esté en el catálogo global. Pasó con una que no existía y desapareció sin
-- avisar: mejor que la semilla se caiga a que deje el piso de venta corto.
DO $$
DECLARE faltan int;
BEGIN
  SELECT 12 - count(*) INTO faltan FROM catalog_units;
  IF faltan <> 0 THEN
    RAISE EXCEPTION 'Faltan % unidades: algún modelo no existe en global_models', faltan;
  END IF;
END $$;

-- Los accesorios específicos se atan a los modelos que de verdad se venden.
DELETE FROM unit_accessory_compatibilities;
INSERT INTO unit_accessory_compatibilities (accessory_id, global_model_id)
SELECT a.id, gm.id
FROM unit_accessories a
JOIN global_brands gb ON gb.name = 'Honda'
JOIN global_models gm ON gm.brand_id = gb.id
WHERE a.is_universal = false
  AND gm.model IN ('CB500F', 'CB190R', 'XR150L');

-- ── Ventas de unidades ───────────────────────────────────────────────
INSERT INTO unit_sales (id, tenant_id, catalog_unit_id, client_id, user_id, folio,
                        list_price, final_price, down_payment, financing_type,
                        bank_financier, status, delivery_date, notes)
SELECT gen_random_uuid(), r.tenant_id, cu.id,
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = v.cliente LIMIT 1),
       r.admin, v.folio, cu.list_price, cu.sale_price, v.enganche,
       v.financiamiento::unit_sales_financing_type_enum, v.banco,
       'COMPLETED', r.hoy - v.dias, v.nota
FROM ref r, (VALUES
  ('VU-2026-0001', '3H1KD0810TD500302', 'Ramos Beltrán', 15000, 'BANK_CREDIT',   'BBVA',  45, 'Financiada a 24 meses'),
  ('VU-2026-0002', '3H1KE0910TD500402', 'Mensajería Rápida del Centro SA de CV', 46900, 'CASH', NULL, 57, 'Flotilla: pago de contado')
) AS v(folio, serie, cliente, enganche, financiamiento, banco, dias, nota)
JOIN catalog_units cu ON cu.serial_number = v.serie;

-- Accesorios que se llevaron con la unidad: es lo que hace que el módulo
-- de accesorios se vea conectado a la venta y no como un catálogo suelto.
INSERT INTO unit_sale_accessories (unit_sale_id, accessory_id, quantity, unit_price)
SELECT us.id, a.id, x.cant, a.price
FROM (VALUES
  ('VU-2026-0001', 'ACC-CASCO',   1),
  ('VU-2026-0001', 'ACC-CANDADO', 1),
  ('VU-2026-0002', 'ACC-BARRAS',  1),
  ('VU-2026-0002', 'ACC-TOPCASE', 1)
) AS x(folio, sku, cant)
JOIN unit_sales us       ON us.folio = x.folio
JOIN unit_accessories a  ON a.sku    = x.sku;

-- ── Contactos de las empresas ────────────────────────────────────────
-- Una flota no la trae el dueño: la trae quien la opera, y es a quien hay
-- que llamar cuando la unidad está lista.
INSERT INTO contacts (id, tenant_id, client_id, first_name, last_name, phone, email,
                      position, department, is_authorized, is_active)
SELECT gen_random_uuid(), r.tenant_id,
       (SELECT id FROM clients WHERE company_name = c.empresa),
       c.nombre, c.apellido, c.tel, c.correo, c.puesto, c.area, c.autorizado, true
FROM ref r, (VALUES
  ('Mensajería Rápida del Centro SA de CV', 'Ricardo', 'Aguilar Sosa', '5551002042', 'ricardo.aguilar@mensajeriarapida.mx', 'Jefe de flotilla', 'Operaciones', true),
  ('Mensajería Rápida del Centro SA de CV', 'Norma',   'Téllez Cano',  '5551002043', 'norma.tellez@mensajeriarapida.mx',   'Compras',          'Administración', false),
  ('Distribuidora Ferretera del Bajío SA',  'Alberto', 'Quiroz Mena',  '5551002044', 'alberto.quiroz@ferreterabajio.mx',   'Encargado de reparto', 'Logística', true)
) AS c(empresa, nombre, apellido, tel, correo, puesto, area, autorizado);

-- ── Prospectos con seguimiento ───────────────────────────────────────
INSERT INTO lead_activities (lead_id, user_id, type, notes, created_at)
SELECT l.id, r.asesor1, a.tipo, a.nota,
       (now() AT TIME ZONE 'America/Mexico_City') - (a.dias || ' days')::interval
FROM ref r, (VALUES
  ('Sofía Delgado Marín',  'LLAMADA', 'Pidió cotización de XR150L con enganche de 15,000', 2),
  ('Sofía Delgado Marín',  'CORREO',  'Se envió cotización con dos planes de financiamiento', 1),
  ('Raúl Ibáñez Cortés',   'VISITA',  'Vino a mostrador, probó la XR150L', 5),
  ('Raúl Ibáñez Cortés',   'LLAMADA', 'Sigue comparando contra Italika DM200', 3),
  ('Verónica Palma Ruiz',  'LLAMADA', 'Cotizó dos Cargo 150 para reparto', 8),
  ('Verónica Palma Ruiz',  'CORREO',  'Solicitó factura a nombre de la empresa', 6),
  ('Grupo Logístico Sur',  'CORREO',  'Pidió propuesta por cinco unidades con descuento', 1),
  ('Ernesto Salas Ibarra', 'VISITA',  'Prueba de manejo de la CB500F; pidió plan a 36 meses', 4),
  ('Ernesto Salas Ibarra', 'LLAMADA', 'Confirmó interés, espera respuesta del banco', 1),
  ('Claudia Ramos Beltrán','VISITA',  'Cerró la compra de la XR150L', 45),
  ('Tomás Vera Zúñiga',    'LLAMADA', 'Avisó que compró en otra agencia', 28)
) AS a(prospecto, tipo, nota, dias)
JOIN leads l ON l.name = a.prospecto;

-- ── Cotizaciones ─────────────────────────────────────────────────────
INSERT INTO quotation_folio_seq (tenant_id, year, last_value)
SELECT tenant_id, extract(year FROM hoy)::int, 3 FROM ref;

INSERT INTO quotations (id, tenant_id, branch_id, client_id, user_id, type, folio,
                        status, price_list, subtotal, discount_pct, discount_amount,
                        tax_amount, total, conditions, validity_date, created_at)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = q.cliente LIMIT 1),
       r.admin, q.tipo::quotations_type_enum, q.folio, q.estado::quotations_status_enum,
       q.lista::quotations_price_list_enum, q.subtotal, q.desc_pct,
       round(q.subtotal * q.desc_pct / 100, 2),
       round((q.subtotal - q.subtotal * q.desc_pct / 100) * 0.16, 2),
       round((q.subtotal - q.subtotal * q.desc_pct / 100) * 1.16, 2),
       q.condiciones, r.hoy + 15,
       (now() AT TIME ZONE 'America/Mexico_City') - (q.dias || ' days')::interval
FROM ref r, (VALUES
  ('COT-2026-0001', 'Silva Ortega',  'PARTS',   'SENT',     'PUBLIC',   2075, 0, 'Precios vigentes 15 días. No incluye mano de obra.', 3),
  ('COT-2026-0002', 'Mensajería Rápida del Centro SA de CV', 'SERVICE', 'ACCEPTED', 'BUSINESS', 6800, 8, 'Servicio de flotilla, tres unidades.', 6),
  ('COT-2026-0003', 'Nava Estrada',  'PARTS',   'DRAFT',    'PUBLIC',   1650, 0, NULL, 1)
) AS q(folio, cliente, tipo, estado, lista, subtotal, desc_pct, condiciones, dias);

INSERT INTO quotation_items (quotation_id, part_id, description, quantity, unit_price, discount, subtotal)
SELECT q.id, p.id, p.name, x.cant, p.public_price, 0, p.public_price * x.cant
FROM (VALUES
  ('COT-2026-0001', 'BAL-DEL',   1),
  ('COT-2026-0001', 'BAL-TRA',   1),
  ('COT-2026-0001', 'LIQ-FRE',   1),
  ('COT-2026-0001', 'ACE-10W40', 2),
  ('COT-2026-0002', 'ACE-20W50', 3),
  ('COT-2026-0002', 'FIL-ACE',   3),
  ('COT-2026-0002', 'BUJ-CR8',   3),
  ('COT-2026-0003', 'KIT-ARR',   1)
) AS x(folio, sku, cant)
JOIN quotations q ON q.folio = x.folio
JOIN parts p      ON p.sku   = x.sku;

-- ── Cuentas por cobrar ───────────────────────────────────────────────
-- Lo que dejó a crédito la flotilla: es lo que da contenido a finanzas.
INSERT INTO receivables (id, tenant_id, branch_id, client_id, reference_type,
                         concept, total, paid_amount, due_date, status)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM clients WHERE company_name = c.empresa),
       'ServiceOrder', c.concepto, c.total, c.pagado, r.hoy + c.vence, c.estado
FROM ref r, (VALUES
  -- El vencimiento se deduce de la fecha, no del estatus: los válidos son
  -- OPEN, PARTIAL, PAID y CANCELLED. La segunda ya pasó su fecha.
  ('Mensajería Rápida del Centro SA de CV', 'Servicio de flotilla, tres unidades', 7888, 3000, 12, 'PARTIAL'),
  ('Distribuidora Ferretera del Bajío SA',  'Refacciones a crédito 30 días',        4250, 0,    -5, 'OPEN')
) AS c(empresa, concepto, total, pagado, vence, estado);

-- ── Historial de servicio ────────────────────────────────────────────
-- Órdenes cerradas de meses anteriores. Sin ellas la ficha de un cliente
-- se ve como la de alguien que acaba de llegar, y la relación entre cliente,
-- vehículo y servicio no tiene nada que enseñar.
INSERT INTO service_orders (id, tenant_id, branch_id, owner_id, vehicle_id, user_id,
                            mechanic_id, folio, status, reported_fault, diagnosis,
                            work_performed, km_in, km_out, labor_cost, parts_cost,
                            discount, total, received_at, promised_at, ready_at,
                            delivered_at, tracking_token)
SELECT gen_random_uuid(), r.tenant_id, r.central, v.owner_id, v.id, r.asesor1,
       CASE (row_number() OVER (ORDER BY h.folio)) % 3
         WHEN 0 THEN r.tecnico1 WHEN 1 THEN r.tecnico2 ELSE r.tecnico3 END,
       h.folio, 'DELIVERED', h.falla, h.diagnostico, h.trabajo,
       -- Al kilometraje de hoy se le resta lo recorrido desde entonces, para
       -- que el historial suba y no baje con el tiempo.
       greatest(0, v.mileage - h.km_atras),
       greatest(0, v.mileage - h.km_atras) + 12,
       h.mano_obra, h.refacciones, 0,
       round((h.mano_obra + h.refacciones) * 1.16, 2),
       (r.hoy - h.dias) + time '09:00',
       (r.hoy - h.dias) + time '17:00',
       (r.hoy - h.dias) + time '16:20',
       (r.hoy - h.dias) + time '17:10',
       gen_random_uuid()
FROM ref r, (VALUES
  ('OS-2025-0140', 'NGZ-4401', 'Servicio de 1,000 km',   'Ajustes de fábrica',            'Aceite, filtro y torques',          210,  4200,  850,  480),
  ('OS-2025-0155', 'MPT-2210', 'Servicio de 5,000 km',   'Mantenimiento programado',      'Aceite, filtro y bujía',            170,  5100,  900,  455),
  ('OS-2025-0161', 'QWE-3344', 'Ruido en cadena',        'Cadena fuera de tensión',       'Ajuste y lubricación',              155,  3800,  400,  0),
  ('OS-2025-0168', 'QWE-3344', 'Servicio de 10,000 km',  'Mantenimiento programado',      'Aceite, filtros, bujía y frenos',   130, 10200, 1200, 1580),
  ('OS-2025-0177', 'ZXC-1188', 'Servicio de 5,000 km',   'Mantenimiento de flotilla',     'Aceite, filtro y revisión',         115,  6400,  900,  455),
  ('OS-2025-0182', 'FLT-1001', 'Cambio de llanta trasera','Llanta con desgaste irregular','Reemplazo y balanceo',              100,  5900,  350, 1320),
  ('OS-2025-0190', 'FLT-1002', 'Servicio de 5,000 km',   'Mantenimiento de flotilla',     'Aceite, filtro y revisión',          92,  5800,  900,  455),
  ('OS-2025-0198', 'BNM-7766', 'Servicio de 1,000 km',   'Primer servicio',               'Aceite, filtro y torques',           85,  4100,  850,  480),
  ('OS-2025-0205', 'JKL-5512', 'Falla de arranque',      'Batería sulfatada',             'Reemplazo de batería',               70,  3200,  300,  890),
  ('OS-2025-0211', 'FER-2001', 'Servicio de 10,000 km',  'Mantenimiento programado',      'Aceite, filtros, bujía y kit',       62, 11000, 1200, 2100),
  ('OS-2026-0130', 'POI-9922', 'Revisión de garantía',   'Sin falla encontrada',          'Revisión y ajuste general',          45,  1200,  350,  0),
  ('OS-2026-0136', 'RTS-8890', 'Espejo roto',            'Golpe en estacionamiento',      'Reemplazo de espejos',               30,  2600,  200,  340),
  ('OS-2026-0142', 'FLT-1003', 'Servicio de 1,000 km',   'Primer servicio de flotilla',   'Aceite, filtro y torques',           25,  4300,  850,  480),
  ('OS-2026-0149', 'MPT-2210', 'Cambio de llantas',      'Ambas al límite',               'Reemplazo delantera y trasera',      18,  3100,  500, 2500)
) AS h(folio, placa, falla, diagnostico, trabajo, dias, km_atras, mano_obra, refacciones)
JOIN customer_vehicles v ON v.plate = h.placa;

-- Y las refacciones que consumieron, para que el almacén cuadre con la
-- historia y los reportes de consumo no salgan en cero.
INSERT INTO service_order_parts (service_order_id, part_id, quantity, unit_price, subtotal)
SELECT so.id, p.id, x.cant, p.public_price, p.public_price * x.cant
FROM (VALUES
  ('OS-2025-0140', 'ACE-10W40', 2), ('OS-2025-0140', 'FIL-ACE', 1),
  ('OS-2025-0155', 'ACE-10W40', 2), ('OS-2025-0155', 'FIL-ACE', 1), ('OS-2025-0155', 'BUJ-CR8', 1),
  ('OS-2025-0168', 'ACE-20W50', 2), ('OS-2025-0168', 'FIL-ACE', 1), ('OS-2025-0168', 'BAL-DEL', 1),
  ('OS-2025-0177', 'ACE-10W40', 2), ('OS-2025-0177', 'FIL-ACE', 1),
  ('OS-2025-0182', 'LLA-TRA', 1),
  ('OS-2025-0190', 'ACE-10W40', 2), ('OS-2025-0190', 'FIL-ACE', 1),
  ('OS-2025-0198', 'ACE-10W40', 2), ('OS-2025-0198', 'FIL-ACE', 1),
  ('OS-2025-0205', 'BAT-YTX7', 1),
  ('OS-2025-0211', 'ACE-20W50', 2), ('OS-2025-0211', 'KIT-ARR', 1),
  ('OS-2026-0136', 'ESP-JUEGO', 1),
  ('OS-2026-0142', 'ACE-10W40', 2), ('OS-2026-0142', 'FIL-ACE', 1),
  ('OS-2026-0149', 'LLA-DEL', 1), ('OS-2026-0149', 'LLA-TRA', 1)
) AS x(folio, sku, cant)
JOIN service_orders so ON so.folio = x.folio
JOIN parts p           ON p.sku    = x.sku;

-- ── Fichaje de los técnicos ──────────────────────────────────────────
-- Lo que alimenta el rendimiento del taller: tiempo real contra baremo.
INSERT INTO service_order_times (service_order_id, mechanic_id, started_at, ended_at,
                                 minutes, notes)
SELECT so.id, so.mechanic_id,
       so.received_at + interval '25 minutes',
       so.received_at + interval '25 minutes' + (t.minutos || ' minutes')::interval,
       t.minutos, 'Trabajo registrado por el técnico'
FROM service_orders so
JOIN (VALUES
  ('OS-2025-0140', 55), ('OS-2025-0155', 70), ('OS-2025-0161', 35),
  ('OS-2025-0168', 130), ('OS-2025-0177', 65), ('OS-2025-0182', 45),
  ('OS-2025-0190', 68), ('OS-2025-0198', 52), ('OS-2025-0205', 40),
  ('OS-2025-0211', 145), ('OS-2026-0130', 30), ('OS-2026-0136', 25),
  ('OS-2026-0142', 58), ('OS-2026-0149', 50)
) AS t(folio, minutos) ON t.folio = so.folio;

-- ── Compras al proveedor ─────────────────────────────────────────────
-- Una recibida y otra en camino: es lo que explica que el almacén tenga
-- existencias y que el filtro de aire esté por llegar.
INSERT INTO purchase_orders (id, tenant_id, branch_id, supplier_id, user_id, folio,
                             status, subtotal, tax_amount, total, ordered_at,
                             expected_at, received_at, notes)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM suppliers WHERE name = o.proveedor), r.admin, o.folio,
       o.estado::purchase_orders_status_enum, o.subtotal,
       round(o.subtotal * 0.16, 2), round(o.subtotal * 1.16, 2),
       r.hoy - o.pedida, r.hoy - o.pedida + 7,
       CASE WHEN o.estado = 'RECEIVED' THEN r.hoy - o.pedida + 5 END, o.nota
FROM ref r, (VALUES
  ('OC-2026-0031', 'Refaccionaria Central de Motos SA', 'RECEIVED', 18400, 21, 'Resurtido mensual de consumibles'),
  ('OC-2026-0034', 'Distribuidora Honda Nacional',      'SENT',      9600,  4, 'Filtros de aire y bujías; pendiente de llegar'),
  ('OC-2026-0036', 'Llantas y Rines del Valle',         'DRAFT',    12800,  1, 'Borrador: reposición de llantas')
) AS o(folio, proveedor, estado, subtotal, pedida, nota);

INSERT INTO purchase_order_items (purchase_order_id, part_id, quantity, quantity_received, unit_price, subtotal)
SELECT po.id, p.id, x.cant,
       CASE WHEN po.status = 'RECEIVED' THEN x.cant ELSE 0 END,
       p.purchase_price, p.purchase_price * x.cant
FROM (VALUES
  ('OC-2026-0031', 'ACE-10W40', 48), ('OC-2026-0031', 'FIL-ACE', 24),
  ('OC-2026-0031', 'BUJ-CR8',   36), ('OC-2026-0031', 'BAL-DEL', 12),
  ('OC-2026-0034', 'FIL-AIRE',  30), ('OC-2026-0034', 'BUJ-CR8', 24),
  ('OC-2026-0036', 'LLA-DEL',   10), ('OC-2026-0036', 'LLA-TRA', 10)
) AS x(folio, sku, cant)
JOIN purchase_orders po ON po.folio = x.folio
JOIN parts p            ON p.sku    = x.sku;

-- ── Cuentas por pagar ────────────────────────────────────────────────
INSERT INTO payables (id, tenant_id, branch_id, supplier_id, reference_type,
                      concept, total, paid_amount, due_date, status)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM suppliers WHERE name = c.proveedor),
       'PurchaseOrder', c.concepto, c.total, c.pagado, r.hoy + c.vence, c.estado
FROM ref r, (VALUES
  ('Refaccionaria Central de Motos SA', 'OC-2026-0031 resurtido mensual', 21344, 21344, -12, 'PAID'),
  ('Distribuidora Honda Nacional',      'OC-2026-0034 filtros y bujías',  11136, 0,      18, 'OPEN'),
  ('Lubricantes Industriales del Norte','Aceite a granel de marzo',        8700, 4000,    5, 'PARTIAL')
) AS c(proveedor, concepto, total, pagado, vence, estado);

-- ── Caja y mostrador ─────────────────────────────────────────────────
-- Una caja abierta hoy con sus ventas: sin esto el módulo de caja arranca
-- pidiendo abrir turno y no se puede enseñar nada.
INSERT INTO cash_sessions (id, tenant_id, branch_id, user_id, opening_balance,
                           total_cash, total_card, total_transfer, total_sales,
                           opened_at, status)
SELECT gen_random_uuid(), r.tenant_id, r.central, r.asesor1, 2000,
       1580, 2470, 0, 4050, r.hoy + time '08:00', 'OPEN'
FROM ref r;

INSERT INTO sales (id, tenant_id, branch_id, cash_session_id, client_id, user_id,
                   sale_type, status, payment_method, price_list, subtotal,
                   discount, tax_amount, total, ticket_number, created_at)
SELECT gen_random_uuid(), r.tenant_id, r.central,
       (SELECT id FROM cash_sessions LIMIT 1),
       (SELECT id FROM clients WHERE coalesce(company_name, last_name) = v.cliente LIMIT 1),
       r.asesor1, 'COUNTER', 'PAID', v.forma::sales_payment_method_enum,
       'PUBLIC', v.subtotal, 0, round(v.subtotal * 0.16, 2),
       round(v.subtotal * 1.16, 2), v.ticket, r.hoy + v.hora::time
FROM ref r, (VALUES
  ('TKT-000451', 'Silva Ortega',   'CASH',     495, '09:15'),
  ('TKT-000452', 'Nava Estrada',   'CARD',    1650, '10:40'),
  ('TKT-000453', 'Ibarra Luna',    'CASH',     330, '11:20'),
  ('TKT-000454', 'Rojas Cabrera',  'CARD',     890, '12:05')
) AS v(ticket, cliente, forma, subtotal, hora);

INSERT INTO sale_items (sale_id, part_id, quantity, unit_price, discount, subtotal)
SELECT s.id, p.id, x.cant, p.public_price, 0, p.public_price * x.cant
FROM (VALUES
  ('TKT-000451', 'ACE-10W40', 3),
  ('TKT-000452', 'KIT-ARR',   1),
  ('TKT-000453', 'BUJ-CR8',   2),
  ('TKT-000454', 'BAT-YTX7',  1)
) AS x(ticket, sku, cant)
JOIN sales s ON s.ticket_number = x.ticket
JOIN parts p ON p.sku = x.sku;

-- ── Garantías ────────────────────────────────────────────────────────
INSERT INTO warranties (id, tenant_id, branch_id, client_id, vehicle_id,
                        service_order_id, type, description, status, resolution,
                        start_date, end_date)
SELECT gen_random_uuid(), r.tenant_id, r.central, v.owner_id, v.id,
       (SELECT id FROM service_orders WHERE folio = g.folio),
       g.tipo::warranties_type_enum, g.descripcion,
       g.estado::warranties_status_enum, g.resolucion,
       r.hoy - g.desde, r.hoy - g.desde + 365
FROM ref r, (VALUES
  ('POI-9922', 'OS-2026-0130', 'UNIT',    'Ruido en tren delantero dentro del periodo de garantía', 'RESOLVED',    'Ajuste de suspensión sin costo', 45),
  ('BNM-7766', 'OS-2025-0198', 'PART',    'Batería falló a los tres meses',                          'IN_PROGRESS', NULL, 20),
  ('FLT-1001', 'OS-2025-0182', 'SERVICE', 'Vibración tras el cambio de llanta',                      'OPEN',        NULL, 8)
) AS g(placa, folio, tipo, descripcion, estado, resolucion, desde)
JOIN customer_vehicles v ON v.plate = g.placa;

-- ── Cumplimiento PLD ─────────────────────────────────────────────────
-- Las operaciones en efectivo que rebasan el umbral. La venta de contado de
-- la flotilla es justo el caso que obliga a identificar al cliente.
INSERT INTO pld_operations (id, tenant_id, branch_id, client_id, reference_type,
                            reference_id, amount, uma_value, uma_amount,
                            operation_date, requires_identification,
                            requires_notice, file_status, notice_status, notes)
SELECT gen_random_uuid(), r.tenant_id, r.central, us.client_id, 'UnitSale', us.id,
       us.final_price, 113.14, round(us.final_price / 113.14, 2),
       us.delivery_date, true, false, 'COMPLETO', 'NO_APLICA',
       'Venta de contado; expediente integrado'
FROM ref r, unit_sales us
WHERE us.financing_type = 'CASH';

COMMIT;
