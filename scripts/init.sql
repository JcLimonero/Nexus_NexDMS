-- NexDMS — Script de inicialización de PostgreSQL
-- Se ejecuta automáticamente al crear el contenedor por primera vez

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verificar extensiones
DO $$
BEGIN
  RAISE NOTICE 'Extensiones instaladas: uuid-ossp y pgcrypto';
END $$;
