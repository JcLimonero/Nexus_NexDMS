# Validación de implementaciones

Para que cada implementación se valide al 100% antes de darla por terminada, sigue este flujo.

## Implementación a la primera

1. **Test de integración**: Crea `test/<modulo>.integration.e2e-spec.ts` que use el **servicio real** (sin mock). Así se detectan errores de DB, orderBy, migraciones, etc.
2. **orderBy en TypeORM**: Usa siempre el nombre de la propiedad (camelCase): `orderBy('alias.propiedad', 'DESC')`, nunca el nombre de columna. Ejemplo: `createdAt` vs `created_at`.
3. **applyScope**: Si el scope es SUCURSAL, valida `user.branchId` antes de usarlo en la query.
4. **Ejecutar `npm run validate`** antes de dar por terminado.

## Checklist post-implementación

1. **API**
   - [ ] `npm run api:build` — compila sin errores
   - [ ] `npm run api:migration:run` — migraciones al día
   - [ ] Tests E2E del módulo pasan

2. **Frontend**
   - [ ] `cd apps/web && npm run build` — compila sin errores

3. **Integración manual**
   - [ ] API corriendo (`npm run api:dev`)
   - [ ] Web corriendo (`npm run web:dev`)
   - [ ] Navegar al módulo nuevo — sin 500 ni errores en consola
   - [ ] Crear/editar/ver registros — flujo funcional

## Script de validación automática

```bash
npm run validate
```

Ejecuta en orden:
1. Build API
2. Migraciones
3. Tests E2E (warehouse-transfers, purchase-orders)
4. Build Web

## Errores frecuentes y soluciones

### 500 en endpoint nuevo
- **orderBy en TypeORM**: Usar el **nombre de la propiedad** (camelCase), no el nombre de columna. Ejemplo: `orderBy('wt.createdAt', 'DESC')` en lugar de `orderBy('wt.created_at', 'DESC')`. Si usas snake_case, TypeORM puede lanzar `Cannot read properties of undefined (reading 'databaseName')`.
- **Migraciones**: Asegúrate de que la migración del módulo exista y se haya ejecutado (`npm run api:migration:run`).
- **Scope/User**: Si el usuario tiene `scope: SUCURSAL` pero `branchId` es null, la consulta puede fallar. Los servicios deben tener guardas como:
  ```ts
  if (!user.branchId) {
    qb.andWhere('1 = 0');
    return;
  }
  ```
- **Proxy**: La web en `localhost:4200` hace proxy de `/api` a `localhost:3000`. Verifica que la API esté en 3000.
- **Errores reales**: En desarrollo, el 500 incluye `message` y `stack` con el error real. Revisa la consola de la API o el body de la respuesta.

### API no responde
- Verifica que Redis esté corriendo (la API lo usa para sesiones).
- Revisa `.env` y variables de conexión a DB.
