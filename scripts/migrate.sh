#!/bin/sh
# Ejecuta migraciones dentro del contenedor API
# Uso: ./scripts/migrate.sh [run|revert]
# O desde la raíz: docker compose exec api npm run migration:run

set -e
cd "$(dirname "$0")/.."

case "${1:-run}" in
  run)
    docker compose exec api npm run migration:run
    ;;
  revert)
    docker compose exec api npm run migration:revert
    ;;
  *)
    echo "Uso: $0 [run|revert]"
    exit 1
    ;;
esac
