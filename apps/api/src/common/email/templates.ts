/**
 * Plantillas base de correo (HTML email-safe: tablas + estilos inline, 600px,
 * fuentes web-safe). Son la referencia para TODOS los correos del sistema:
 *
 * - {@link wrapAdminEmail}: avisos internos de Nexus (morosos, alertas del
 *   SaaS). Marca Nexus Q Tech / NexQSystem.
 * - {@link wrapClientEmail}: correos que el concesionario manda a su cliente
 *   final; toma el nombre, color y logo del propio concesionario.
 *
 * Cada builder recibe el CONTENIDO ya en HTML y lo envuelve en el cascarón de
 * marca. El resultado es el `html_message` que se pasa a EmailJS.
 */

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Aclara/oscurece un hex para derivar la hairline de acento del encabezado. */
function shade(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((n >> 16) + 255 * pct);
  const g = clamp(((n >> 8) & 0xff) + 255 * pct);
  const b = clamp((n & 0xff) + 255 * pct);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Botón de acción (call-to-action) email-safe. */
export function emailButton(label: string, url: string, color = '#2563eb'): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
    <tr><td style="border-radius:10px;background:${color};box-shadow:0 2px 6px ${color}40">
      <a href="${url}" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:.2px">${escape(label)}</a>
    </td></tr>
  </table>`;
}

export type PillTone = 'danger' | 'warning' | 'success' | 'neutral';

/** Pastilla de estado, email-safe (colores sólidos). */
export function statusPill(label: string, tone: PillTone = 'neutral'): string {
  const c: Record<PillTone, [string, string]> = {
    danger: ['#fee2e2', '#b91c1c'],
    warning: ['#fef3c7', '#b45309'],
    success: ['#dcfce7', '#15803d'],
    neutral: ['#eef2f7', '#475569'],
  };
  const [bg, fg] = c[tone];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg};color:${fg};font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.03em">${escape(label)}</span>`;
}

interface AdminOpts {
  title: string;
  content: string;
  /** Etiqueta pequeña sobre el título (eyebrow). */
  eyebrow?: string;
  /** URL absoluta del logo de Nexus (email requiere URL pública). */
  logoUrl?: string | null;
  /** Texto de vista previa en la bandeja. */
  preheader?: string;
}

/** Cascarón de correo interno de Nexus (NexQSystem Administración). */
export function wrapAdminEmail(opts: AdminOpts): string {
  const year = new Date().getFullYear();
  const accent = '#38bdf8';
  const marca = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Nexus Q Tech" style="height:34px;max-width:220px;display:block">`
    : `<span style="font-family:${FONT};font-size:21px;font-weight:700;color:#ffffff;letter-spacing:.3px">Nex<span style="color:${accent}">DMS</span></span>`;
  return baseShell({
    preheader: opts.preheader ?? opts.title,
    headerBg: '#0b1220',
    accent,
    brand: marca,
    brandRight: `<span style="font-family:${FONT};font-size:11px;font-weight:600;color:#7c8aa5;letter-spacing:.14em;text-transform:uppercase">Administración</span>`,
    eyebrow: opts.eyebrow ?? 'Nexus Q Tech · NexQSystem',
    eyebrowColor: accent,
    title: opts.title,
    titleColor: '#0b1220',
    content: opts.content,
    footer: `Aviso automático de <strong style="color:#64748b">NexQSystem</strong> · Nexus Q Tech · ${year}<br>Este es un correo automático; no es necesario responder.`,
  });
}

interface ClientOpts {
  brandName: string;
  accent?: string;
  logoUrl?: string | null;
  title: string;
  content: string;
  eyebrow?: string;
  preheader?: string;
  /** Pie extra del concesionario (dirección, teléfono). */
  contactLine?: string;
}

/** Cascarón de correo del concesionario hacia su cliente final. */
export function wrapClientEmail(opts: ClientOpts): string {
  const accent = opts.accent || '#2563eb';
  const year = new Date().getFullYear();
  const marca = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${escape(opts.brandName)}" style="height:38px;max-width:220px;display:block">`
    : `<span style="font-family:${FONT};font-size:21px;font-weight:700;color:#ffffff;letter-spacing:.2px">${escape(opts.brandName)}</span>`;
  return baseShell({
    preheader: opts.preheader ?? opts.title,
    headerBg: accent,
    accent: shade(accent, -0.25),
    brand: marca,
    eyebrow: opts.eyebrow,
    eyebrowColor: accent,
    title: opts.title,
    titleColor: '#0f172a',
    content: opts.content,
    footer:
      `Este correo te lo env&iacute;a <strong style="color:#64748b">${escape(opts.brandName)}</strong>.` +
      (opts.contactLine ? `<br>${escape(opts.contactLine)}` : '') +
      `<br><span style="color:#b6c0cd">Enviado con NexQSystem · ${year}</span>`,
  });
}

interface ShellOpts {
  preheader: string;
  headerBg: string;
  accent: string;
  brand: string;
  brandRight?: string;
  eyebrow?: string;
  eyebrowColor: string;
  title: string;
  titleColor: string;
  content: string;
  footer: string;
}

/** Estructura común: fondo suave, tarjeta 600px con hairline de acento. */
function baseShell(o: ShellOpts): string {
  const eyebrow = o.eyebrow
    ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${o.eyebrowColor}">${escape(o.eyebrow)}</p>`
    : '';
  const brandRight = o.brandRight
    ? `<td align="right" style="vertical-align:middle">${o.brandRight}</td>`
    : '';
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:#eef2f6;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6ebf1;box-shadow:0 6px 28px rgba(15,23,42,.07)">
        <tr><td style="padding:24px 40px;background:${o.headerBg}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle">${o.brand}</td>
            ${brandRight}
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;background:${o.accent};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:36px 40px 40px">
          ${eyebrow}
          <h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;font-weight:700;line-height:1.25;color:${o.titleColor}">${escape(o.title)}</h1>
          <div style="font-family:${FONT};font-size:15px;line-height:1.65;color:#475569">${o.content}</div>
        </td></tr>
        <tr><td style="padding:22px 40px;background:#f8fafc;border-top:1px solid #e6ebf1;font-family:${FONT};font-size:12px;line-height:1.6;color:#94a3b8">${o.footer}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:${FONT};font-size:11px;color:#b6c0cd">NexQSystem · Sistema de gestión para concesionarios</p>
    </td></tr>
  </table>
</body></html>`;
}
