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

-- ── Refacciones ──────────────────────────────────────────────────────
-- Precios de mostrador de motocicleta. Dos quedan por debajo del mínimo a
-- propósito: el filtro de aire en cero y las balatas traseras al límite.
INSERT INTO parts (id, tenant_id, branch_id, sku, name, description, vehicle_type,
                   unit_of_measure, purchase_price, public_price, wholesale_price,
                   business_price, stock_quantity, min_stock, max_stock, is_active)
SELECT gen_random_uuid(), r.tenant_id, r.central, p.sku, p.nombre, p.descr, 'MOTORCYCLE',
       p.unidad, p.compra, p.publico, p.mayoreo, p.empresa, p.stock, p.minimo, p.maximo, true
FROM ref r, (VALUES
  ('ACE-10W40', 'Aceite 10W-40 mineral (litro)', 'Para motor de 4 tiempos', 'LITRO', 92,  165, 148, 140, 48, 12, 80),
  ('ACE-20W50', 'Aceite 20W-50 semisintético (litro)', 'Alta temperatura', 'LITRO', 118, 210, 189, 178, 26, 10, 60),
  ('FIL-ACE',   'Filtro de aceite', 'CB/XR/Cargo', 'PIEZA', 68,  135, 121, 115, 22, 8,  40),
  ('FIL-AIRE',  'Filtro de aire', 'CB190R / XR150L', 'PIEZA', 145, 285, 256, 242, 0,  6,  30),
  ('BUJ-CR8',   'Bujía NGK CR8E', 'Estándar', 'PIEZA', 78,  155, 139, 132, 34, 12, 60),
  ('BAL-DEL',   'Balatas delanteras', 'Juego', 'JUEGO', 210, 420, 378, 357, 14, 6,  30),
  ('BAL-TRA',   'Balatas traseras', 'Juego', 'JUEGO', 185, 370, 333, 315, 5,  6,  30),
  ('KIT-ARR',   'Kit de arrastre completo', 'Catarina, piñón y cadena', 'JUEGO', 890, 1650, 1485, 1402, 9,  4,  20),
  ('CAD-428',   'Cadena 428H x 122', 'Reforzada', 'PIEZA', 320, 610, 549, 518, 12, 5,  25),
  ('LLA-DEL',   'Llanta delantera 90/90-19', 'Uso mixto', 'PIEZA', 640, 1180, 1062, 1003, 8,  4,  20),
  ('LLA-TRA',   'Llanta trasera 110/90-17', 'Uso mixto', 'PIEZA', 720, 1320, 1188, 1122, 7,  4,  20),
  ('BAT-YTX7',  'Batería YTX7L-BS', '12V 6Ah', 'PIEZA', 480, 890, 801, 756, 11, 4,  20),
  ('LIQ-FRE',   'Líquido de frenos DOT-4 (355 ml)', NULL, 'PIEZA', 95,  190, 171, 161, 18, 6,  30),
  ('FOC-H4',    'Foco halógeno H4', 'Faro principal', 'PIEZA', 85,  175, 158, 149, 16, 6,  30),
  ('CAB-EMB',   'Cable de embrague', 'CB190R', 'PIEZA', 130, 265, 239, 225, 9,  4,  20),
  ('ESP-JUEGO', 'Espejos laterales (par)', 'Universal rosca 10mm', 'JUEGO', 175, 340, 306, 289, 13, 4,  20),
  ('EMP-CUL',   'Empaque de culata', 'CB/XR 150-190', 'PIEZA', 110, 225, 203, 191, 7,  3,  15),
  ('SIL-ESC',   'Silenciador de escape', 'Original', 'PIEZA', 1450, 2680, 2412, 2278, 3,  2,  10)
) AS p(sku, nombre, descr, unidad, compra, publico, mayoreo, empresa, stock, minimo, maximo);

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
INSERT INTO leads (id, tenant_id, branch_id, name, phone, email, source, interest, status, assigned_to)
SELECT gen_random_uuid(), r.tenant_id, r.central, l.nombre, l.tel, l.correo,
       l.origen, l.interes, l.estado, r.asesor1
FROM ref r, (VALUES
  ('Sofía Delgado Marín', '5551003001', 'sofia.delgado@correo.mx', 'PORTAL',    'Honda CB190R 2025, cotiza financiamiento', 'NUEVO'),
  ('Raúl Ibáñez Cortés',  '5551003002', 'raul.ibanez@correo.mx',  'MOSTRADOR', 'XR150L para trabajo de campo',             'CONTACTADO'),
  ('Verónica Palma Ruiz', '5551003003', 'veronica.palma@correo.mx','TELEFONO', 'Cargo 150 para reparto, dos unidades',     'COTIZADO'),
  ('Grupo Logístico Sur', '5551003004', 'compras@logisticosur.mx','REFERIDO',  'Flotilla de cinco Cargo 150',              'NUEVO')
) AS l(nombre, tel, correo, origen, interes, estado);

COMMIT;
