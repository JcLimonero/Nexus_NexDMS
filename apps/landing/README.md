# apps/landing — Sitio público de NexDMS

Landing page de marketing de NexDMS, pensada para el **dominio raíz**
`nexusqsystem.com` (y `www`). Es un sitio **100% estático**: un solo
`index.html`, sin framework ni paso de build. Tipografías desde Google Fonts,
íconos en SVG en línea, tema claro/oscuro.

Desde aquí el visitante puede:
- Conocer el producto (flujo, módulos, plataformas por rol, asistente IA, cumplimiento).
- **Acceder** al portal (botón → `https://app.nexusqsystem.com`).
- **Solicitar una demo** (formulario con acuse en el cliente; hoy no envía datos).

## Desarrollo local

No necesita build; sirve el archivo con cualquier servidor estático:

```bash
cd apps/landing
python3 -m http.server 8899
# abrir http://localhost:8899
```

## Despliegue (Vercel)

Es un **proyecto de Vercel aparte** de app/admin/pwa/recepcion, igual que ellos:

1. Nuevo proyecto en Vercel apuntando a este repo.
2. **Root Directory:** `apps/landing`.
3. **Framework Preset:** *Other* — sin Build Command ni Output Directory
   (Vercel sirve `index.html` directo).
4. **Dominios:** `nexusqsystem.com` y `www.nexusqsystem.com`.

El `vercel.json` de esta carpeta solo agrega `cleanUrls` y un par de headers de
seguridad; no hay reescritura a la API porque la landing no la consume.

> Nota: los enlaces a `app.` / `recepcion.` / `pwa.nexusqsystem.com` son los
> portales del producto (proyectos de Vercel propios). Si cambian los
> subdominios, actualízalos en `index.html`.
