-- =====================================================================
-- Taller Demo — Backfill de códigos de cliente.
--
-- Los clientes sembrados por SQL quedaron con client_code NULL (el código
-- legible lo genera la app al crear). Este script les asigna client_code y
-- client_number con el mismo formato (prefijo + 'C' + consecutivo 8) y ajusta
-- la secuencia document_code_seq. En sitio (UPDATE), no borra nada.
-- Re-ejecutable: solo toca los que aún no tienen código.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_tenant uuid;
  v_prefix text;
  v_base   int;
BEGIN
  SELECT id, COALESCE(NULLIF(trim(code_prefix), ''), 'XXX')
    INTO v_tenant, v_prefix
  FROM tenants WHERE slug = 'taller-demo';

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No existe el tenant taller-demo.';
  END IF;

  SELECT COALESCE(last_value, 0) INTO v_base
  FROM document_code_seq WHERE tenant_id = v_tenant AND object_code = 'C';
  IF v_base IS NULL THEN v_base := 0; END IF;

  -- Asigna consecutivos a los que no tienen código, en orden de alta.
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

  -- Deja la secuencia en el mayor consecutivo usado.
  INSERT INTO document_code_seq (tenant_id, object_code, last_value)
  VALUES (v_tenant, 'C', (SELECT COALESCE(max(client_number), 0) FROM clients WHERE tenant_id = v_tenant))
  ON CONFLICT (tenant_id, object_code) DO UPDATE SET last_value = EXCLUDED.last_value;
END $$;

COMMIT;

SELECT count(*) AS clientes,
       count(*) FILTER (WHERE client_code IS NOT NULL) AS con_codigo
FROM clients WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'taller-demo');
