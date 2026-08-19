# Informe UI/UX — Módulo de Login NexDMS

**Proyecto:** Nexus NexDMS  
**Módulo:** `apps/web/src/app/auth/login/`  
**Stack:** Angular 21, Bootstrap 5, template Endless  
**Fecha:** 16 de marzo de 2025  

---

## 1. Resumen ejecutivo

El módulo de login de NexDMS cumple con la funcionalidad básica de autenticación (POST `/api/v1/auth/login`), pero presenta carencias en accesibilidad, usabilidad y consistencia visual que afectan la experiencia de usuario y el cumplimiento de estándares (WCAG, Material Design).

---

## 2. Revisión del código

### 2.1 `login.ts` (componente)

```typescript
// Estructura actual
- FormGroup con validadores: email (required, email), password (required)
- Estados: loading, error, newUser
- Redirección si ya autenticado
- Manejo de TOTP y errores de API
```

**Fortalezas:**
- Uso de Reactive Forms con validadores
- Manejo de estados de carga y error
- Soporte para flujo TOTP

**Debilidades:**
- No hay `autocomplete` explícito en el formulario
- El checkbox "Remember me" no está vinculado al formulario ni tiene lógica
- No hay `aria-live` ni anuncios para lectores de pantalla durante loading/error

### 2.2 `login.html` (template)

```html
<!-- Estructura actual -->
- page-wrapper > auth-bg > authentication-box
- Logo, card con formulario
- Labels sin for/id asociados
- Errores de validación en inglés
- Checkbox "Remember me" sin funcionalidad
- Sección social vacía (login-divider + social)
```

### 2.3 `login.scss` (estilos)

```scss
// Contenido actual
- Animaciones loader (no usadas en el template)
- keyframes para loading-text
```

Los estilos del login provienen principalmente del tema global (`_login.scss`, `_forms.scss`). El archivo local solo define animaciones que no se utilizan.

---

## 3. Evaluación de accesibilidad

### 3.1 Labels y asociación con inputs

| Elemento | Estado | Problema |
|----------|--------|----------|
| Email | ❌ | `<label>` sin atributo `for`; `<input>` sin `id` |
| Password | ❌ | Mismo problema |
| Remember me | ✅ | Tiene `for="checkbox1"` e `id="checkbox1"` |

**Ejemplo actual (problemático):**

```html
<label class="col-form-label pt-0">Email</label>
<input class="form-control" formControlName="email" type="email" required="" />
```

**Recomendación WCAG 2.1 (1.3.1):**

```html
<label for="login-email" class="col-form-label pt-0">Correo electrónico</label>
<input id="login-email" class="form-control" formControlName="email" type="email" required />
```

### 3.2 Focus y navegación por teclado

- No hay `tabindex` explícito ni orden de foco documentado
- El botón de submit se deshabilita durante loading, lo cual es correcto
- Falta indicador visual de foco (`:focus-visible`) personalizado para inputs y botón
- El tema usa `box-shadow` muy sutil en `:focus` (`rgba(171, 140, 228, 0.05)`), lo que puede no cumplir WCAG 2.4.7 (Focus Visible)

### 3.3 Mensajes de error

- Los errores de validación no usan `role="alert"` ni `aria-live="polite"`
- El mensaje de error general sí tiene `role="alert"` ✅
- No hay `aria-describedby` que vincule el input con su mensaje de error
- No hay `aria-invalid` en los inputs cuando hay error

**Ejemplo recomendado:**

```html
<input id="login-email" formControlName="email" type="email"
       [attr.aria-invalid]="loginForm.controls['email'].invalid && loginForm.controls['email'].touched"
       [attr.aria-describedby]="loginForm.controls['email'].errors ? 'email-error' : null" />
@if (loginForm.controls['email'].touched && loginForm.controls['email'].errors?.['required']) {
  <div id="email-error" class="text text-danger mt-1" role="alert">El correo es obligatorio</div>
}
```

### 3.4 Contraste

- Variables del tema: `$theme-body-font-color: #313131`, `$primary-color: #4466f2`
- El texto sobre fondo claro cumple WCAG AA para texto normal
- El texto de error (`text-danger`) depende de Bootstrap; suele ser adecuado
- El placeholder (`$form-placeholder-color`) puede tener contraste insuficiente si es muy claro

### 3.5 Idioma e internacionalización

- Títulos y mensajes mezclan inglés y español: "LOGIN", "Enter your Username and Password", "Email is required", "Invalid Email", "Password is required", "Remember me", "Iniciar sesión", "Iniciando sesión..."
- Inconsistencia que afecta la usabilidad y la accesibilidad (lectores de pantalla)

---

## 4. Evaluación de usabilidad

### 4.1 Flujo de login

- Flujo lineal: email → password → submit
- Redirección automática si ya está autenticado
- No hay enlace a "¿Olvidaste tu contraseña?" ni a registro
- El flujo TOTP muestra el mensaje en el mismo formulario sin indicación clara de qué hacer

### 4.2 Feedback

| Situación | Feedback actual | Valoración |
|-----------|-----------------|------------|
| Envío del formulario | Texto "Iniciando sesión..." en el botón | ✅ Adecuado |
| Error de API | `alert alert-danger` con mensaje | ✅ Adecuado |
| Error de validación | Texto debajo del campo | ✅ Adecuado |
| TOTP requerido | Mismo `error` que errores genéricos | ⚠️ Poco diferenciado |
| Éxito | Redirección inmediata | ✅ Adecuado |

### 4.3 Mensajes de error

- Mensajes de validación en inglés: "Email is required", "Invalid Email", "Password is required"
- Mensaje por defecto de API: "Credenciales inválidas. Intente de nuevo." (español)
- Typo en el template: `mtz-1` en lugar de `mt-1` para el error de password

```html
<!-- Línea 52: typo -->
<div class="text text-danger mtz-1">Password is required</div>
```

### 4.4 Elementos no funcionales

- **Checkbox "Remember me":** No está en el FormGroup, no tiene lógica ni persistencia
- **Sección social:** Contenedor vacío con `login-divider` ("Or Login With") que no aporta valor

---

## 5. Evaluación de diseño visual

### 5.1 Layout

- Estructura centrada con `auth-bg` (imagen de fondo) y `authentication-box` (460px)
- Uso de card Bootstrap
- Logo arriba, formulario debajo

### 5.2 Responsive

- `auth-bg`: `padding: 50px 100px` en desktop; en móvil `padding: 25px 15px`
- `authentication-box`: ancho fijo 460px; no hay `max-width: 100%` explícito en el login
- En `_responsive.scss` solo se ajusta `authentication-main .authentication-box` a 100%, no `auth-bg .authentication-box`
- Riesgo de overflow horizontal en pantallas pequeñas

### 5.3 Consistencia

- Uso de clases del template Endless (`theme-form`, `form-group`, `col-form-label`)
- Mezcla de idiomas en textos
- El título dice "Username" pero el campo es "Email"

---

## 6. Comparación con buenas prácticas

### 6.1 WCAG 2.1

| Criterio | Nivel | Estado |
|----------|-------|--------|
| 1.3.1 Info y relaciones | A | ❌ Labels sin asociación |
| 2.1.1 Teclado | A | ✅ Navegable por teclado |
| 2.4.7 Focus visible | AA | ⚠️ Indicador de foco débil |
| 3.3.1 Identificación de errores | A | ⚠️ Sin aria-invalid/describedby |
| 3.3.2 Etiquetas o instrucciones | A | ⚠️ Mezcla de idiomas |
| 4.1.2 Nombre, función, valor | A | ❌ Inputs sin nombres accesibles completos |

### 6.2 Material Design (formularios)

- No se usan placeholders como sustituto de labels (correcto)
- Falta estado de error visual en el borde del input
- No hay animación de transición en el label
- El botón podría mostrar un spinner durante loading (Material recomienda feedback visual claro)

### 6.3 Bootstrap 5

- Uso correcto de `form-control`, `form-group`, `alert`
- Falta `form-label` en lugar de `col-form-label` para consistencia con BS5
- El `required=""` es redundante si ya hay `Validators.required`

---

## 7. Propuesta de mejoras priorizadas

### Prioridad ALTA

| # | Mejora | Archivo | Descripción |
|---|--------|---------|-------------|
| 1 | Asociar labels con inputs | `login.html` | Añadir `id` a inputs y `for` a labels (email, password) |
| 2 | Corregir typo `mtz-1` | `login.html` | Cambiar a `mt-1` en el error de password |
| 3 | Unificar idioma | `login.html`, `login.ts` | Usar español en todos los textos (o i18n) |
| 4 | Añadir enlace "¿Olvidaste tu contraseña?" | `login.html` | Si existe ruta de recuperación, enlazarla |
| 5 | Atributos ARIA para errores | `login.html` | `aria-invalid`, `aria-describedby`, `role="alert"` en mensajes de validación |

### Prioridad MEDIA

| # | Mejora | Archivo | Descripción |
|---|--------|---------|-------------|
| 6 | Eliminar o implementar "Remember me" | `login.html`, `login.ts` | Quitar si no se usa, o implementar con persistencia de sesión |
| 7 | Eliminar sección social vacía | `login.html` | Quitar `login-divider` y contenedor social si no hay login social |
| 8 | Mejorar indicador de foco | `login.scss` o tema | Reforzar `:focus-visible` para cumplir WCAG 2.4.7 |
| 9 | Autocomplete en formulario | `login.html` | `autocomplete="email"` y `autocomplete="current-password"` |
| 10 | Responsive del authentication-box | tema o `login.scss` | Asegurar `max-width: 100%` en móvil |

### Prioridad BAJA

| # | Mejora | Archivo | Descripción |
|---|--------|---------|-------------|
| 11 | Spinner en botón durante loading | `login.html` | Añadir icono/spinner además del texto |
| 12 | Limpiar `login.scss` | `login.scss` | Eliminar animaciones no usadas |
| 13 | Título coherente | `login.html` | Cambiar "Username" por "Correo electrónico" o "Email" |
| 14 | Flujo TOTP diferenciado | `login.html`, `login.ts` | UI específica cuando se requiere TOTP |

---

## 8. Ejemplos de código sugeridos

### 8.1 Labels e IDs (login.html)

```html
<div class="form-group">
  <label for="login-email" class="col-form-label pt-0">Correo electrónico</label>
  <input
    id="login-email"
    class="form-control"
    formControlName="email"
    type="email"
    autocomplete="email"
    [attr.aria-invalid]="loginForm.controls['email'].invalid && loginForm.controls['email'].touched"
    [attr.aria-describedby]="(loginForm.controls['email'].touched && loginForm.controls['email'].errors) ? 'email-error' : null"
  />
  @if (loginForm.controls['email'].touched && loginForm.controls['email'].errors?.['required']) {
    <div id="email-error" class="text text-danger mt-1" role="alert">El correo es obligatorio</div>
  }
  @if (loginForm.controls['email'].touched && loginForm.controls['email'].errors?.['email']) {
    <div id="email-error" class="text text-danger mt-1" role="alert">Correo electrónico no válido</div>
  }
</div>
```

### 8.2 Autocomplete y región live para errores

```html
<form class="theme-form" [formGroup]="loginForm" (ngSubmit)="login()" autocomplete="on">
  <div aria-live="polite" aria-atomic="true">
    @if (error) {
      <div class="alert alert-danger" role="alert">{{ error }}</div>
    }
  </div>
  <!-- ... -->
  <input formControlName="password" type="password" autocomplete="current-password" ... />
```

### 8.3 Enlace "¿Olvidaste tu contraseña?"

```html
<div class="form-group d-flex justify-content-end">
  <a routerLink="/auth/forgot-password" class="text-muted small">¿Olvidaste tu contraseña?</a>
</div>
```

---

## 9. Conclusión

El login de NexDMS cumple su función básica pero necesita ajustes para:

1. **Accesibilidad:** asociación label-input, ARIA y foco visible  
2. **Usabilidad:** mensajes en un solo idioma, enlace a recuperación de contraseña, eliminación de elementos no funcionales  
3. **Diseño:** consistencia responsive y corrección de detalles visuales  

Aplicando las mejoras de prioridad alta se lograría un nivel aceptable de accesibilidad (WCAG 2.1 AA) y una experiencia de usuario más coherente.
