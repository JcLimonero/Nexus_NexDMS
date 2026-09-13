import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseOrder } from './entities/purchase-order.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../../common/storage/storage.service';
import {
  PdfDoc,
  PDF_TENUE,
  PDF_LINEA,
  descargarLogo,
} from '../../common/pdf/pdf-doc';

const ESTATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PARTIAL: 'Recibida parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const TERMINOS: Record<string, string> = {
  CASH: 'Contado',
  CREDIT: 'Crédito',
};

/**
 * Orden de compra a proveedor en papel.
 *
 * Es el documento que se manda al proveedor para autorizar el surtido: qué se
 * pide, a qué precio y a dónde entregarlo. A diferencia del resto de las
 * impresiones (que van al cliente), el encabezado es el del negocio que compra
 * y lleva un bloque "Proveedor" con a quién se le pide. Comparte identidad con
 * todas las demás vía `PdfDoc`.
 */
@Injectable()
export class OrdenCompraPdfService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    orderId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const po = await this.orderRepo.findOne({
      where: { id: orderId, tenantId },
      relations: ['items', 'items.part'],
    });
    if (!po) throw new NotFoundException('Orden de compra no encontrada');

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({
      where: { id: po.branchId },
    });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const proveedor = await this.supplierRepo.findOne({
      where: { id: po.supplierId },
    });
    const quien = po.userId
      ? await this.userRepo.findOne({ where: { id: po.userId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const comprador = quien
      ? `${quien.firstName ?? ''} ${quien.lastName ?? ''}`.trim()
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
      titulo: 'Orden de compra',
      folio: po.folio,
      estatus: ESTATUS[po.status] ?? po.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha de orden', pdf.soloFecha(po.orderedAt)],
        ['Entrega esperada', po.expectedAt ? pdf.soloFecha(po.expectedAt) : '—'],
        ['Solicitó', comprador],
        ['Impresa', pdf.impresion()],
      ],
    });

    // ── Proveedor + dónde entregar ──
    pdf.seccion('Proveedor');
    pdf.campos(
      [
        ['Nombre o razón social', proveedor?.name ?? ''],
        ['RFC', proveedor?.rfc ?? ''],
        ['Contacto', proveedor?.contactName ?? ''],
        ['Teléfono', proveedor?.phone ?? ''],
        ['Correo', proveedor?.email ?? ''],
        ['Condiciones', TERMINOS[proveedor?.paymentTerms ?? ''] ?? proveedor?.paymentTerms ?? ''],
      ],
      3,
    );
    doc.fontSize(6.5).fillColor(PDF_TENUE).text('ENTREGAR EN', M, doc.y);
    doc
      .fontSize(9)
      .fillColor(pdf.tinta)
      .text(
        [sucursal?.name, sucursal?.address, [sucursal?.city, sucursal?.state].filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' · ') || '—',
        M,
        doc.y,
        { width: ancho },
      );
    doc.moveDown(0.4);

    // ── Partidas ──
    pdf.seccion('Refacciones solicitadas');

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

    fila(['Clave · Descripción', 'Cant.', 'P. unitario', 'Importe'], {
      negrita: true,
      tenue: true,
    });
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
    doc.moveDown(0.3);

    const items = po.items ?? [];
    if (items.length) {
      for (const it of items) {
        const p = it.part;
        fila([
          `${p?.sku ? p.sku + ' · ' : ''}${p?.name ?? 'Refacción'}`,
          String(it.quantity),
          pdf.dinero(it.unitPrice),
          pdf.dinero(it.subtotal),
        ]);
        if (it.warrantyMonths || it.warrantyNote) {
          const g = [
            it.warrantyMonths ? `Garantía ${it.warrantyMonths} meses` : null,
            it.warrantyNote,
          ]
            .filter(Boolean)
            .join(' · ');
          doc.fontSize(7).fillColor(PDF_TENUE).text(`   ${g}`, M, doc.y, {
            width: cDesc,
          });
          doc.moveDown(0.1);
        }
      }
    } else {
      fila(['Sin partidas capturadas', '', '', ''], { tenue: true });
    }

    // ── Totales (lo guardado, que es lo que se paga) ──
    pdf.divisorTotales();
    pdf.lineaTotal('Subtotal', pdf.dinero(po.subtotal));
    pdf.lineaTotal('IVA', pdf.dinero(po.taxAmount));
    pdf.lineaTotal('TOTAL', pdf.dinero(po.total), true);

    // ── Notas ──
    doc.moveDown(0.4);
    if (po.notes) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('NOTAS', M, doc.y);
      doc.fontSize(8.5).fillColor(pdf.tinta).text(po.notes, { width: ancho });
      doc.moveDown(0.3);
    }
    pdf.nota(
      'Precios en moneda nacional. Favor de referir el folio de esta orden en su ' +
        'factura y remisión. La recepción está sujeta a verificación de cantidad y ' +
        'estado de la mercancía.',
    );

    // ── Firmas ──
    pdf.firmas([
      ['Autoriza', comprador],
      ['Recibe (proveedor)', proveedor?.name ?? ''],
    ]);

    pdf.pieDePagina(`Orden de compra ${po.folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `${po.folio}.pdf`,
      folio: po.folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: proveedor?.email ?? null,
    };
  }
}
