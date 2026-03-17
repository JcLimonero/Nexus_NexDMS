#!/usr/bin/env bash
# Validación end-to-end de implementaciones (Plan-Ejecuta-Valida)
# Ejecutar después de implementar un módulo nuevo o cambios en API/frontend.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Build API ==="
npm run api:build
echo ""

echo "=== 2. Migraciones (verificar que no falten) ==="
npm run api:migration:run
echo ""

echo "=== 3. Tests E2E API (mocked + integración real DB) ==="
cd apps/api && npm run test:e2e -- warehouse-transfers purchase-orders warehouse-transfers.integration && cd "$ROOT"
echo ""

echo "=== 4. Build Web ==="
cd apps/web && npm run build && cd "$ROOT"
echo ""

echo "=== 5. Validación completada ==="
echo "Para probar manualmente:"
echo "  1. npm run api:dev (en una terminal)"
echo "  2. npm run web:dev (en otra terminal)"
echo "  3. Navegar a /almacen/transferencias - debe cargar sin 500"
