/**
 * Plantillas base de correo (HTML email-safe: tablas + estilos inline, 600px,
 * fuentes web-safe). Son la referencia para TODOS los correos del sistema:
 *
 * - {@link wrapAdminEmail}: avisos internos de Nexus (morosos, alertas del
 *   SaaS). Marca Nexus Q Tech / NexDMS.
 * - {@link wrapClientEmail}: correos que el concesionario manda a su cliente
 *   final; toma el nombre, color y logo del propio concesionario para que el
 *   correo se sienta suyo.
 *
 * Cada builder recibe el CONTENIDO ya en HTML y lo envuelve en el cascarón de
 * marca. El resultado es el `html_message` que se pasa a EmailJS.
 */

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Botón de acción (call-to-action) email-safe, reutilizable en el contenido. */
export function emailButton(label: string, url: string, color = '#2563eb'): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0">
    <tr><td style="border-radius:8px;background:${color}">
      <a href="${url}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${escape(label)}</a>
    </td></tr>
  </table>`;
}

interface AdminOpts {
  /** Título grande dentro del cuerpo. */
  title: string;
  /** Contenido en HTML (párrafos, tablas, botones). */
  content: string;
  /** URL absoluta del logo de Nexus (email requiere URL pública). */
  logoUrl?: string | null;
  /** Línea de preheader (texto de vista previa en la bandeja). */
  preheader?: string;
}

/** Cascarón de correo interno de Nexus (NexDMS Administración). */
export function wrapAdminEmail(opts: AdminOpts): string {
  const year = new Date().getFullYear();
  const marca = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Nexus Q Tech" style="max-height:40px;max-width:220px;display:block">`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:.5px">Nex<span style="color:#38bdf8">DMS</span></span>
       <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;margin-left:10px">Administración · Nexus Q Tech</span>`;
  return baseShell({
    preheader: opts.preheader ?? opts.title,
    header: `<td style="padding:22px 32px;background:#0f172a">${marca}</td>`,
    title: opts.title,
    titleColor: '#0f172a',
    content: opts.content,
    footer: `Aviso automático de NexDMS · Nexus Q Tech · ${year}<br>No respondas a este correo.`,
  });
}

interface ClientOpts {
  /** Nombre del concesionario (aparece en el encabezado y pie). */
  brandName: string;
  /** Color de acento del concesionario (hex). Default azul NexDMS. */
  accent?: string;
  /** URL absoluta del logo del concesionario (opcional). */
  logoUrl?: string | null;
  title: string;
  content: string;
  preheader?: string;
}

/** Cascarón de correo del concesionario hacia su cliente final. */
export function wrapClientEmail(opts: ClientOpts): string {
  const accent = opts.accent || '#2563eb';
  const year = new Date().getFullYear();
  const marca = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${escape(opts.brandName)}" style="max-height:40px;max-width:200px;display:block">`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff">${escape(opts.brandName)}</span>`;
  return baseShell({
    preheader: opts.preheader ?? opts.title,
    header: `<td style="padding:22px 32px;background:${accent}">${marca}</td>`,
    title: opts.title,
    titleColor: '#1f2937',
    content: opts.content,
    footer: `Este correo te lo envía <strong>${escape(opts.brandName)}</strong>.<br>Enviado con NexDMS · ${year}`,
    accent,
  });
}

interface ShellOpts {
  preheader: string;
  header: string;
  title: string;
  titleColor: string;
  content: string;
  footer: string;
  accent?: string;
}

/** Estructura común: fondo gris, tarjeta blanca 600px, encabezado, cuerpo, pie. */
function baseShell(o: ShellOpts): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:#f1f5f9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>${o.header}</tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:${o.titleColor}">${escape(o.title)}</h1>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#334155">${o.content}</div>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8">${o.footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
