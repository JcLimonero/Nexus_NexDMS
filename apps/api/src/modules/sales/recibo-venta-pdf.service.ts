import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Part } from '../parts/entities/part.entity';
import { StorageService } from '../../common/storage/storage.service';
import {
  PdfDoc,
  PDF_TENUE,
  PDF_LINEA,
  descargarLogo,
} from '../../common/pdf/pdf-doc';

export type FormatoRecibo = 'carta' | 'ticket';

const METODO: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  MIXED: 'Mixto',
};

const TIPO: Record<string, string> = {
  COUNTER: 'Mostrador',
  SERVICE_ORDER: 'Orden de servicio',
};

/**
 * Recibo / ticket de una venta (mostrador o cobro de orden de servicio).
 *
 * Comprobante operativo —no fiscal— del cobro. Dos formatos: carta (formal, para
 * reimprimir o mandar por correo) y ticket de 80 mm (impresora térmica del
 * mostrador). Comparte la identidad de marca con el resto (`PdfDoc`).
 */
@Injectable()
export class ReciboVentaPdfService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly itemRepo: Repository<SaleItem>,
    @InjectRepository(Part) private readonly partRepo: Repository<Part>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  private async cargar(tenantId: string, saleId: string) {
    const venta = await this.saleRepo.findOne({
      where: { id: saleId, tenantId },
      relations: ['client'],
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    const items = await this.itemRepo.find({ where: { saleId } });
    const partes = items.length
      ? await this.partRepo.find({
          where: { id: In(items.map((i) => i.partId)) },
        })
      : [];
    const nombreParte = new Map(partes.map((p) => [p.id, p]));
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({
      where: { id: venta.branchId },
    });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);
    const cliente = venta.client
      ? venta.client.companyName ||
        `${venta.client.firstName ?? ''} ${venta.client.lastName ?? ''}`.trim()
      : 'Público en general';
    return { venta, items, nombreParte, t, sucursal, razon, logo, cliente };
  }

  private nombreItem(
    it: SaleItem,
    nombreParte: Map<string, Part>,
  ): string {
    const p = nombreParte.get(it.partId);
    return `${p?.sku ? p.sku + ' · ' : ''}${p?.name ?? 'Producto'}`;
  }

  async generar(
    tenantId: string,
    saleId: string,
    formato: FormatoRecibo = 'carta',
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const d = await this.cargar(tenantId, saleId);
    const buffer =
      formato === 'ticket' ? await this.ticket(d) : await this.carta(d);
    return {
      buffer,
      filename: `recibo-${d.venta.ticketNumber}.pdf`,
      folio: d.venta.ticketNumber,
      negocio: d.razon?.name ?? d.sucursal?.name ?? 'Negocio',
      clientEmail: d.venta.client?.email ?? null,
    };
  }

  // ─── Formato carta ─────────────────────────────────
  private async carta(d: Awaited<ReturnType<typeof this.cargar>>): Promise<Buffer> {
    const { venta, items, nombreParte, t, sucursal, razon, logo, cliente } = d;
    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const senas = [
      sucursal?.name,
      sucursal?.address,
      [sucursal?.city, sucursal?.state].filter(Boolean).join(', '),
      sucursal?.counterPhone ? `Tel. ${sucursal.counterPhone}` : null,
      razon?.rfc ? `RFC ${razon.rfc}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    pdf.encabezado({
      titulo: 'Recibo de venta',
      folio: venta.ticketNumber,
      estatus: TIPO[venta.saleType] ?? '',
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(venta.createdAt)],
        ['Método de pago', METODO[venta.paymentMethod] ?? venta.paymentMethod],
        ['Cliente', cliente],
        ['Impreso', pdf.impresion()],
      ],
    });

    pdf.seccion('Conceptos');
    const cImporte = 80;
    const cPU = 70;
    const cCant = 40;
    const cDesc = ancho - cImporte - cPU - cCant;
    const fila = (
      celdas: [string, string, string, string],
      o: { negrita?: boolean; tenue?: boolean } = {},
    ) => {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const y = doc.y;
      doc
        .font(o.negrita ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .fillColor(o.tenue ? PDF_TENUE : pdf.tinta);
      doc.text(celdas[0], M, y, { width: cDesc - 6 });
      const alto = doc.y - y;
      doc.text(celdas[1], M + cDesc, y, { width: cCant - 6, align: 'right' });
      doc.text(celdas[2], M + cDesc + cCant, y, { width: cPU - 6, align: 'right' });
      doc.text(celdas[3], M + cDesc + cCant + cPU, y, {
        width: cImporte - 6,
        align: 'right',
      });
      doc.y = y + Math.max(alto, 11);
    };
    fila(['Concepto', 'Cant.', 'P. unitario', 'Importe'], {
      negrita: true,
      tenue: true,
    });
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
    doc.moveDown(0.3);
    if (items.length) {
      for (const it of items) {
        fila([
          this.nombreItem(it, nombreParte),
          String(it.quantity),
          pdf.dinero(it.unitPrice),
          pdf.dinero(it.subtotal),
        ]);
      }
    } else {
      // Venta de orden de servicio: el detalle vive en la orden; aquí una línea resumen.
      fila([
        venta.saleType === 'SERVICE_ORDER'
          ? 'Servicios y refacciones (orden de servicio)'
          : 'Venta',
        '1',
        pdf.dinero(venta.subtotal),
        pdf.dinero(venta.subtotal),
      ]);
    }

    pdf.divisorTotales();
    pdf.lineaTotal('Subtotal', pdf.dinero(venta.subtotal));
    if (Number(venta.discount) > 0)
      pdf.lineaTotal('Descuento', `- ${pdf.dinero(venta.discount)}`);
    pdf.lineaTotal('IVA', pdf.dinero(venta.taxAmount));
    pdf.lineaTotal('TOTAL', pdf.dinero(venta.total), true);

    pdf.nota(
      'Comprobante operativo, no es un comprobante fiscal (CFDI). Si requiere factura, ' +
        'solicítela con este número de ticket.',
    );
    pdf.pieDePagina(`Recibo ${venta.ticketNumber}`);
    return pdf.finalizar();
  }

  // ─── Formato ticket 80 mm ──────────────────────────
  private async ticket(d: Awaited<ReturnType<typeof this.cargar>>): Promise<Buffer> {
    const { venta, items, nombreParte, t, sucursal, razon, logo, cliente } = d;
    // 80 mm ≈ 226 pt de ancho. Alto amplio; la térmica corta el sobrante.
    const pdf = new PdfDoc({ size: [226, 700], margin: 12, paletteId: t?.palette });
    const { doc } = pdf;
    const W = doc.page.width - 24;
    const centro = { width: W, align: 'center' as const };

    if (logo) {
      try {
        doc.image(logo, 12 + (W - 120) / 2, 12, { fit: [120, 34] });
        doc.y = 12 + 38;
      } catch {
        /* cae al nombre */
      }
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(pdf.marca)
      .text(razon?.name ?? sucursal?.name ?? 'Negocio', 12, doc.y, centro);
    doc.font('Helvetica').fontSize(7).fillColor(PDF_TENUE);
    if (sucursal?.address) doc.text(sucursal.address, centro);
    const linea2 = [sucursal?.city, sucursal?.counterPhone]
      .filter(Boolean)
      .join(' · ');
    if (linea2) doc.text(linea2, centro);
    if (razon?.rfc) doc.text(`RFC ${razon.rfc}`, centro);

    doc.moveDown(0.4);
    doc
      .fontSize(8)
      .fillColor(pdf.tinta)
      .text(`Ticket ${venta.ticketNumber}`, 12, doc.y, centro);
    doc.fontSize(7).fillColor(PDF_TENUE).text(pdf.fecha(venta.createdAt), centro);
    doc.text(`Cliente: ${cliente}`, centro);

    doc.moveDown(0.3);
    doc
      .moveTo(12, doc.y)
      .lineTo(12 + W, doc.y)
      .dash(1, { space: 2 })
      .strokeColor(PDF_LINEA)
      .stroke()
      .undash();
    doc.moveDown(0.3);

    // Items: descripción en una línea, y "cant x precio ....... importe" abajo.
    const lineas = items.length
      ? items.map((it) => ({
          nombre: this.nombreItem(it, nombreParte),
          cant: it.quantity,
          pu: Number(it.unitPrice),
          sub: Number(it.subtotal),
        }))
      : [
          {
            nombre:
              venta.saleType === 'SERVICE_ORDER'
                ? 'Servicios y refacciones (OS)'
                : 'Venta',
            cant: 1,
            pu: Number(venta.subtotal),
            sub: Number(venta.subtotal),
          },
        ];
    for (const it of lineas) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(pdf.tinta)
        .text(it.nombre, 12, doc.y, { width: W });
      const y = doc.y;
      doc
        .fontSize(7)
        .fillColor(PDF_TENUE)
        .text(`${it.cant} x ${pdf.dinero(it.pu)}`, 12, y, { width: W * 0.55 });
      doc
        .fillColor(pdf.tinta)
        .text(pdf.dinero(it.sub), 12 + W * 0.55, y, {
          width: W * 0.45,
          align: 'right',
        });
      doc.y = y + 11;
    }

    doc
      .moveTo(12, doc.y)
      .lineTo(12 + W, doc.y)
      .dash(1, { space: 2 })
      .strokeColor(PDF_LINEA)
      .stroke()
      .undash();
    doc.moveDown(0.3);

    const tot = (etq: string, val: string, fuerte = false) => {
      const y = doc.y;
      doc
        .font(fuerte ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fuerte ? 10 : 8)
        .fillColor(fuerte ? pdf.marca : PDF_TENUE)
        .text(etq, 12, y, { width: W * 0.5 });
      doc
        .fillColor(fuerte ? pdf.marca : pdf.tinta)
        .text(val, 12 + W * 0.5, y, { width: W * 0.5, align: 'right' });
      doc.y = y + (fuerte ? 14 : 11);
    };
    tot('Subtotal', pdf.dinero(venta.subtotal));
    if (Number(venta.discount) > 0) tot('Descuento', `- ${pdf.dinero(venta.discount)}`);
    tot('IVA', pdf.dinero(venta.taxAmount));
    tot('TOTAL', pdf.dinero(venta.total), true);
    doc.moveDown(0.2);
    tot('Pago', METODO[venta.paymentMethod] ?? venta.paymentMethod);

    doc.moveDown(0.6);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(PDF_TENUE)
      .text('¡Gracias por su compra!', 12, doc.y, centro);
    doc.text('Comprobante no fiscal. Solicite su factura con este ticket.', centro);

    return pdf.finalizar();
  }
}
