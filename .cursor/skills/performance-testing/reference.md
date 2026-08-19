# Referencia — Performance Testing NexDMS

## Patrones de cleanup

### Suscripciones RxJS

```typescript
// ✅ Correcto (Angular 16+)
private destroyRef = inject(DestroyRef);
this.service.getData().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);

// ❌ Evitar
this.service.getData().subscribe(...); // sin cleanup
```

### Event listeners

```typescript
// ✅ Correcto
ngOnDestroy() {
  this.element.removeEventListener('scroll', this.handler);
}
```

### Timers

```typescript
// ✅ Correcto
private intervalId?: number;
ngOnInit() {
  this.intervalId = window.setInterval(...);
}
ngOnDestroy() {
  if (this.intervalId) clearInterval(this.intervalId);
}
```

## Comandos útiles

```bash
# Buscar subscriptions sin takeUntil
rg "\.subscribe\(" apps/web/src --type ts -A 2 | rg -v "takeUntil"

# Buscar ngOnDestroy
rg "ngOnDestroy" apps/web/src --type ts -l

# Build con stats
cd apps/web && ng build --configuration=production --stats-json
```

## Límites de budget (angular.json)

- initial: 500kB warning, 8mb error
- anyComponentStyle: 4kB warning, 8mb error
