.PHONY: api-dev api-build migration-generate migration-run migration-revert db-up db-down

api-dev:
	cd apps/api && npm run start:dev

api-build:
	cd apps/api && npm run build

migration-generate:
	cd apps/api && npm run build && npm run migration:generate -- src/database/migrations/$(name)

migration-run:
	cd apps/api && npm run migration:run

migration-revert:
	cd apps/api && npm run migration:revert

db-up:
	docker-compose up -d postgres redis

db-down:
	docker-compose stop postgres redis
