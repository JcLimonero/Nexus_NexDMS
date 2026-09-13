import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BodyworkOrder } from './entities/bodywork-order.entity';
import { BodyworkItem } from './entities/bodywork-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import {
  PdfDoc,
  PDF_TENUE,
  PDF_LINEA,
  descargarLogo,
} from '../../common/pdf/pdf-doc';

const ESTATUS: Record<string, string> = {
  RECEIVED: 'Recibida',
  IN_PROGRESS: 'En proceso',
  READY: 'Lista para entrega',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const OPERACION: Record<string, string> = {
  labor: 'Mano de obra',
  material: 'Material',
  part: 'Refacción',
  replace: 'Cambio',
  repair: 'Reparación',
  paint: 'Pintura',
};

/**
 * Presupuesto de colisión (hojalatería y pintura), en papel.
 *
 * Es lo que se acuerda con el cliente o la aseguradora antes de reparar: qué
 * piezas y operaciones, y el desglose entre mano de obra, material y
 * refacciones. Comparte encabezado, secciones y totales con el resto (`PdfDoc`).
 */
@Injectable()
export class BodyworkPdfService {
  constructor(
    @InjectRepository(BodyworkOrder)
    private readonly orderRepo: Repository<BodyworkOrder>,
    @InjectRepository(BodyworkItem)
    private readonly itemRepo: Repository<BodyworkItem>,
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
    orderId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const o = await this.orderRepo.findOne({
      where: { id: orderId, tenantId },
    });
    if (!o) throw new NotFoundException('Orden de colisión no encontrada');

    const items = await this.itemRepo.find({ where: { orderId } });
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = o.branchId
      ? await this.branchRepo.findOne({ where: { id: o.branchId } })
      : null;
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

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
      titulo: 'Presupuesto de colisión',
      folio: o.folio,
      estatus: ESTATUS[o.status] ?? o.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Hojalatería y pintura',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(o.receivedAt ?? o.createdAt)],
        ['Pago', o.paymentType === 'INSURANCE' ? 'Aseguradora' : 'Cliente'],
        ['Impresa', pdf.impresion()],
      ],
    });

    // ── Cliente y unidad ──
    pdf.seccion('Cliente y unidad');
    pdf.campos(
      [
        ['Cliente', o.clientName ?? ''],
        ['Teléfono', o.clientPhone ?? ''],
        [
          'Unidad',
          [o.vehicleBrand, o.vehicleModel, o.vehicleYear]
            .filter(Boolean)
            .join(' '),
        ],
        ['Placas', o.vehiclePlate ?? ''],
        ['Color', o.vehicleColor ?? ''],
        ['No. de serie', o.vehicleVin ?? ''],
      ],
      3,
    );

    // ── Siniestro (solo si aseguradora) ──
    if (o.paymentType === 'INSURANCE') {
      pdf.seccion('Datos del siniestro');
      pdf.campos(
        [
          ['Aseguradora', o.insuranceCompany ?? ''],
          ['No. de póliza', o.policyNumber ?? ''],
          ['No. de siniestro', o.claimNumber ?? ''],
          ['Ajustador', o.adjuster ?? ''],
          ['Fecha del siniestro', o.claimDate ? pdf.soloFecha(o.claimDate) : ''],
          ['Deducible', pdf.dinero(o.deductible)],
        ],
        3,
      );
    }

    // ── Conceptos ──
    pdf.seccion('Conceptos del presupuesto');
    const cImporte = 90;
    const cOper = 90;
    const cCant = 40;
    const cDesc = ancho - cImporte - cOper - cCant;

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
      doc.text(celdas[1], M + cDesc, y, { width: cOper - 6 });
      doc.text(celdas[2], M + cDesc + cOper, y, {
        width: cCant - 6,
        align: 'right',
      });
      doc.text(celdas[3], M + cDesc + cOper + cCant, y, {
        width: cImporte - 6,
        align: 'right',
      });
      doc.y = y + Math.max(alto, 11);
    };

    fila(['Pieza / concepto', 'Operación', 'Cant.', 'Importe'], {
      negrita: true,
      tenue: true,
    });
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
    doc.moveDown(0.3);

    if (items.length) {
      for (const it of items) {
        fila([
          it.partName,
          OPERACION[it.operation] ?? it.operation,
          String(it.quantity),
          pdf.dinero(it.subtotal),
        ]);
      }
    } else {
      fila(['Sin conceptos capturados', '', '', ''], { tenue: true });
    }

    // ── Totales ──
    pdf.divisorTotales();
    pdf.lineaTotal('Mano de obra', pdf.dinero(o.laborTotal));
    pdf.lineaTotal('Material', pdf.dinero(o.materialTotal));
    pdf.lineaTotal('Refacciones', pdf.dinero(o.partsTotal));
    pdf.lineaTotal('TOTAL', pdf.dinero(o.total), true);
    if (o.paymentType === 'INSURANCE' && Number(o.deductible) > 0) {
      pdf.lineaTotal('Deducible a cargo del cliente', pdf.dinero(o.deductible));
    }

    // ── Daños / observaciones ──
    doc.moveDown(0.4);
    if (o.damageDescription) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('DAÑOS', M, doc.y);
      doc
        .fontSize(8.5)
        .fillColor(pdf.tinta)
        .text(o.damageDescription, { width: ancho });
      doc.moveDown(0.2);
    }
    if (o.observations) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('OBSERVACIONES', M, doc.y);
      doc
        .fontSize(8.5)
        .fillColor(pdf.tinta)
        .text(o.observations, { width: ancho });
      doc.moveDown(0.2);
    }

    pdf.nota(
      'Precios en moneda nacional. Presupuesto sujeto a revisión: al desarmar la ' +
        'unidad pueden aparecer daños ocultos que se cotizan por separado y requieren ' +
        'autorización antes de repararse.',
    );

    pdf.firmas([
      ['Autorización del cliente', o.clientName ?? ''],
      ['Asesor', ''],
    ]);

    pdf.pieDePagina(`Presupuesto ${o.folio}`);

    return { buffer: await pdf.finalizar(), filename: `${o.folio}.pdf` };
  }
}
