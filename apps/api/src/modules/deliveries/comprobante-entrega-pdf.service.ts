import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Delivery } from './entities/delivery.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, descargarLogo } from '../../common/pdf/pdf-doc';

const KIND: Record<string, string> = {
  UNIT_SALE: 'Entrega de unidad',
  SERVICE: 'Entrega de vehículo (taller)',
};

/**
 * Comprobante de entrega.
 *
 * Acuse que el cliente firma al recibir la unidad o el vehículo del taller:
 * qué se entregó (checklist), notas y firma. Comparte la identidad del resto de
 * las impresiones (`PdfDoc`).
 */
@Injectable()
export class ComprobanteEntregaPdfService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepo: Repository<Delivery>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    deliveryId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const d = await this.deliveryRepo.findOne({
      where: { id: deliveryId, tenantId },
    });
    if (!d) throw new NotFoundException('Entrega no encontrada');

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({ where: { id: d.branchId } });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const cli = d.clientId
      ? await this.clientRepo.findOne({ where: { id: d.clientId } })
      : null;
    const quien = d.deliveredBy
      ? await this.userRepo.findOne({ where: { id: d.deliveredBy } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);
    const firma = d.signatureKey
      ? await descargarLogo(this.storage, d.signatureKey)
      : null;

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const cliente = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    const entrego = quien
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
      titulo: 'Comprobante de entrega',
      folio: d.folio,
      estatus: KIND[d.kind] ?? d.kind,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha de entrega', pdf.fecha(d.deliveredAt ?? d.createdAt)],
        ['Cliente', cliente],
        ['Referencia', d.referenceLabel ?? '—'],
        ['Entregó', entrego],
        ['Impreso', pdf.impresion()],
      ],
    });

    // Checklist de lo entregado, con casilla marcada.
    pdf.seccion('Qué se entregó');
    const items = Array.isArray(d.checklist) ? d.checklist : [];
    if (items.length) {
      const colW = ancho / 2;
      let x = M;
      let y = doc.y;
      items.forEach((it, i) => {
        if (i > 0 && i % 2 === 0) {
          x = M;
          y += 18;
        }
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = doc.y;
          x = M;
        }
        doc.rect(x, y + 1, 9, 9).lineWidth(0.7).strokeColor(PDF_TENUE).stroke();
        if (it.done) {
          doc
            .moveTo(x + 1.8, y + 5.5)
            .lineTo(x + 3.7, y + 7.5)
            .lineTo(x + 7, y + 2.5)
            .lineWidth(1.2)
            .strokeColor(pdf.marca)
            .stroke();
        }
        doc
          .fontSize(9)
          .fillColor(pdf.tinta)
          .text(it.label, x + 14, y, { width: colW - 20, ellipsis: true });
        x += colW;
      });
      doc.y = y + 20;
      doc.x = M;
    } else {
      doc.fontSize(9).fillColor(PDF_TENUE).text('Sin checklist capturado.', M, doc.y);
      doc.moveDown(0.5);
    }

    if (d.notes) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('OBSERVACIONES', M, doc.y);
      doc.fontSize(9).fillColor(pdf.tinta).text(d.notes, { width: ancho });
      doc.moveDown(0.3);
    }

    // Firma: si el cliente firmó en pantalla, se incrusta; si no, va la raya.
    doc.moveDown(1.2);
    if (doc.y > doc.page.height - 120) doc.addPage();
    const wFirma = (ancho - 40) / 2;
    const y = doc.y + 40;
    if (firma) {
      try {
        doc.image(firma, M, doc.y, { fit: [wFirma, 44], align: 'center' });
      } catch {
        /* formato no soportado: queda la raya */
      }
    }
    doc.moveTo(M, y).lineTo(M + wFirma, y).strokeColor(PDF_TENUE).lineWidth(0.7).stroke();
    doc.fontSize(7).fillColor(PDF_TENUE).text('Firma de quien recibe', M, y + 4, {
      width: wFirma,
    });
    if (cliente) {
      doc.fontSize(8).fillColor(pdf.tinta).text(cliente, M, y + 13, {
        width: wFirma,
        ellipsis: true,
      });
    }
    const x2 = M + wFirma + 40;
    doc.moveTo(x2, y).lineTo(x2 + wFirma, y).strokeColor(PDF_TENUE).lineWidth(0.7).stroke();
    doc.fontSize(7).fillColor(PDF_TENUE).text('Entregó', x2, y + 4, { width: wFirma });
    if (entrego) {
      doc.fontSize(8).fillColor(pdf.tinta).text(entrego, x2, y + 13, {
        width: wFirma,
        ellipsis: true,
      });
    }
    doc.y = y + 30;

    pdf.nota(
      'El cliente declara recibir a su entera satisfacción lo descrito en este comprobante.',
    );
    pdf.pieDePagina(`Entrega ${d.folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `${d.folio}.pdf`,
      folio: d.folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: cli?.email ?? null,
    };
  }
}
