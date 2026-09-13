import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, PDF_LINEA } from '../../common/pdf/pdf-doc';

const TIPO: Record<string, string> = {
  PARTS: 'Refacciones',
  SERVICE: 'Servicio',
  UNIT: 'Venta de unidad',
};

const ESTATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Por aprobar',
  APPROVED: 'Aprobada',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
  CONVERTED: 'Convertida',
};

const URGENCIA: Record<string, string> = {
  URGENTE: 'Urgente',
  RECOMENDADO: 'Recomendado',
  OPCIONAL: 'Opcional',
};

/**
 * Cotización / presupuesto en papel.
 *
 * Es el documento que más se imprime y se manda al cliente antes de autorizar
 * un trabajo o una compra. Comparte el encabezado de marca, las secciones y los
 * totales con el resto de las impresiones (ver `PdfDoc`): la única diferencia
 * es el contenido.
 */
@Injectable()
export class CotizacionPdfService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly itemRepo: Repository<QuotationItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    quotationId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const q = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
      relations: ['client', 'user'],
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');

    const items = await this.itemRepo.find({
      where: { quotationId },
    });

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({ where: { id: q.branchId } });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;

    // Logotipo del tenant para el encabezado (best-effort).
    let logo: Buffer | null = null;
    if (t?.logoKey) {
      try {
        logo = await this.storage.download(t.logoKey);
      } catch {
        logo = null;
      }
    }

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const asesor = q.user
      ? `${q.user.firstName ?? ''} ${q.user.lastName ?? ''}`.trim()
      : '';

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
      titulo: 'Cotización',
      folio: q.folio,
      estatus: ESTATUS[q.status] ?? q.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(q.createdAt)],
        ['Vigencia', q.validityDate ? pdf.soloFecha(q.validityDate) : '—'],
        ['Tipo', TIPO[q.type] ?? q.type],
        ['Asesor', asesor],
        ['Impresa', pdf.impresion()],
        ['Folio', q.folio],
      ],
    });

    // ── Cliente ──
    const cli = q.client;
    const nombre = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    pdf.seccion('Datos del cliente');
    pdf.campos(
      [
        ['Nombre o razón social', nombre],
        ['RFC', cli?.rfc ?? ''],
        ['Teléfono', cli?.phone ?? ''],
        ['Correo', cli?.email ?? ''],
        ['Domicilio', cli?.address ?? ''],
        ['Ciudad', [cli?.city, cli?.state].filter(Boolean).join(', ')],
      ],
      3,
    );

    // ── Conceptos ──
    pdf.seccion('Conceptos cotizados');

    const cImporte = 80;
    const cPU = 70;
    const cCant = 40;
    const cDesc = ancho - cImporte - cPU - cCant;

    const fila = (
      celdas: [string, string, string, string],
      opciones: { negrita?: boolean; tenue?: boolean } = {},
    ) => {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const y = doc.y;
      doc
        .font(opciones.negrita ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .fillColor(opciones.tenue ? PDF_TENUE : pdf.tinta);
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
        const urg =
          it.urgency && URGENCIA[it.urgency] ? ` [${URGENCIA[it.urgency]}]` : '';
        fila([
          `${it.description}${urg}`,
          String(it.quantity),
          pdf.dinero(it.unitPrice),
          pdf.dinero(it.subtotal),
        ]);
        if (it.clientLineNote) {
          doc
            .fontSize(7)
            .fillColor(PDF_TENUE)
            .text(`   ${it.clientLineNote}`, M, doc.y, { width: cDesc });
          doc.moveDown(0.1);
        }
      }
    } else {
      fila(['Sin conceptos capturados', '', '', ''], { tenue: true });
    }

    // ── Totales (usa lo guardado, que es lo que se cobra) ──
    pdf.divisorTotales();
    const subtotal = Number(q.subtotal) || 0;
    const descuento = Number(q.discountAmount) || 0;
    const iva = Number(q.taxAmount) || 0;
    const total = Number(q.total) || 0;
    pdf.lineaTotal('Subtotal', pdf.dinero(subtotal));
    if (descuento) {
      const pct = Number(q.discountPct) || 0;
      pdf.lineaTotal(
        pct ? `Descuento ${pct}%` : 'Descuento',
        `- ${pdf.dinero(descuento)}`,
      );
    }
    pdf.lineaTotal('IVA', pdf.dinero(iva));
    pdf.lineaTotal('TOTAL', pdf.dinero(total), true);

    // ── Condiciones ──
    doc.moveDown(0.4);
    if (q.conditions) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('CONDICIONES', M, doc.y);
      doc.fontSize(8.5).fillColor(pdf.tinta).text(q.conditions, { width: ancho });
      doc.moveDown(0.3);
    }
    pdf.nota(
      'Precios en moneda nacional. Cotización sujeta a vigencia; los precios y la ' +
        'disponibilidad pueden cambiar después de esa fecha. Los trabajos o refacciones ' +
        'no incluidos se cotizan por separado.',
    );

    // ── Firma ──
    pdf.firmas([
      ['Aceptación del cliente', nombre],
      ['Asesor', asesor],
    ]);

    pdf.pieDePagina(`Cotización ${q.folio}`);

    return { buffer: await pdf.finalizar(), filename: `${q.folio}.pdf` };
  }
}
