import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailProvider } from '../../modules/notifications/providers/email.provider';

export interface EnvioDocumento {
  /** Correo del destinatario (el cliente). */
  to: string;
  /** Nombre del negocio/razón social, para el saludo y el asunto. */
  negocio: string;
  /** Tipo de documento legible: "Cotización", "Recibo de pago"… */
  tipo: string;
  /** Folio del documento, para el asunto. */
  folio: string;
  /** Nombre del archivo adjunto (p. ej. `COT-2026-0025.pdf`). */
  filename: string;
  /** El PDF ya generado. */
  buffer: Buffer;
  /** Mensaje opcional del asesor; si no viene, se usa uno por defecto. */
  mensaje?: string;
}

/**
 * Envío de documentos por correo (con el PDF adjunto).
 *
 * Reutiliza el proveedor de correo del sistema (Resend soporta adjuntos) para
 * que cualquier impresión —cotización, orden, recibo, presupuesto— se pueda
 * mandar al cliente desde la misma acción, sin salir del sistema.
 *
 * NOTA (pendiente): hoy el remitente es el dominio de la plataforma. Para que
 * cada correo salga con el DOMINIO DEL CLIENTE hay que verificar su dominio en
 * el proveedor y firmar (SPF/DKIM/DMARC) por tenant — ver PENDIENTES.md.
 */
@Injectable()
export class DocumentoCorreoService {
  constructor(private readonly email: EmailProvider) {}

  async enviar(d: EnvioDocumento): Promise<{ success: boolean; id?: string }> {
    const to = d.to?.trim();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new BadRequestException('Correo del destinatario inválido');
    }

    const asunto = `${d.tipo} ${d.folio} — ${d.negocio}`;
    const cuerpo =
      d.mensaje?.trim() ||
      `Le compartimos su ${d.tipo.toLowerCase()} ${d.folio}. La encontrará adjunta en PDF.`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#16262F;font-size:14px;line-height:1.6">
        <p>${this.escapar(cuerpo)}</p>
        <p style="color:#5A6B78;font-size:12px;margin-top:24px">
          ${this.escapar(d.negocio)}<br>
          Enviado desde su sistema de gestión.
        </p>
      </div>`;

    return this.email.send({
      to,
      subject: asunto,
      html,
      attachments: [{ filename: d.filename, content: d.buffer }],
    });
  }

  private escapar(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}
