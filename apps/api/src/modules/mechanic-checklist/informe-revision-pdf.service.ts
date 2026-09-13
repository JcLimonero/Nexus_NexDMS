import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MechanicSafetyChecklist } from './entities/mechanic-safety-checklist.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
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

/** Etiqueta y color (semáforo) de cada estatus de punto revisado. */
const ESTATUS: Record<string, { label: string; color: string }> = {
  BUENO: { label: 'Bueno', color: '#1E9E5A' },
  OK: { label: 'OK', color: '#1E9E5A' },
  REGULAR: { label: 'Regular', color: '#D89A15' },
  MALO: { label: 'Malo', color: '#C0392B' },
  REEMPLAZAR: { label: 'Reemplazar', color: '#C0392B' },
  FALLA: { label: 'Falla', color: '#C0392B' },
};

/**
 * Informe de revisión de la unidad (puntos de seguridad).
 *
 * Es el reporte que se entrega al cliente al recibir su unidad del taller: el
 * estado de cada punto revisado —llantas, balatas, niveles…— con su semáforo, la
 * nota del técnico y lo que conviene atender. Comparte la identidad del resto de
 * las impresiones (`PdfDoc`); los puntos vienen del catálogo del tenant.
 */
@Injectable()
export class InformeRevisionPdfService {
  constructor(
    @InjectRepository(MechanicSafetyChecklist)
    private readonly safetyRepo: Repository<MechanicSafetyChecklist>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    serviceOrderId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId },
      relations: ['vehicle', 'owner', 'mechanic'],
    });
    if (!so) throw new NotFoundException('Orden de servicio no encontrada');

    // Un punto puede evaluarse varias veces; nos quedamos con la última por
    // punto (el repo ya ordena por fecha desc).
    const filas = await this.safetyRepo.find({
      where: { serviceOrderId },
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
    const vistos = new Set<string>();
    const puntos = filas.filter((f) => {
      if (vistos.has(f.itemId)) return false;
      vistos.add(f.itemId);
      return true;
    });
    puntos.sort((a, b) => (a.item?.sortOrder ?? 0) - (b.item?.sortOrder ?? 0));

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({ where: { id: so.branchId } });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const cli = so.owner as unknown as Record<string, unknown> | undefined;
    const cliente = cli
      ? (cli['companyName'] as string) ||
        `${(cli['firstName'] as string) ?? ''} ${(cli['lastName'] as string) ?? ''}`.trim()
      : so.receptionName || '';
    const v = so.vehicle as unknown as Record<string, unknown> | undefined;
    const tecnico = so.mechanic
      ? `${so.mechanic.firstName ?? ''} ${so.mechanic.lastName ?? ''}`.trim()
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
      titulo: 'Informe de revisión',
      folio: so.folio,
      estatus: 'Puntos de seguridad',
      entidad: razon?.name ?? sucursal?.name ?? 'Taller',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(so.receivedAt ?? so.createdAt)],
        ['Cliente', cliente],
        [
          'Unidad',
          [v?.['make'], v?.['model'], v?.['year']].filter(Boolean).join(' '),
        ],
        ['Placas', (v?.['plate'] as string) ?? ''],
        ['Kilometraje', so.kmIn ? `${so.kmIn.toLocaleString('es-MX')} km` : ''],
        ['Técnico', tecnico],
      ],
    });

    // ── Resumen del semáforo ──
    const cuenta = { bien: 0, atencion: 0, urgente: 0 };
    for (const p of puntos) {
      const s = p.status;
      if (s === 'BUENO' || s === 'OK') cuenta.bien++;
      else if (s === 'REGULAR') cuenta.atencion++;
      else cuenta.urgente++;
    }
    pdf.seccion('Resumen');
    const resumen: [string, number, string][] = [
      ['En buen estado', cuenta.bien, '#1E9E5A'],
      ['A vigilar', cuenta.atencion, '#D89A15'],
      ['Requiere atención', cuenta.urgente, '#C0392B'],
    ];
    const wRes = ancho / 3;
    const yRes = doc.y;
    resumen.forEach(([lbl, n, color], i) => {
      const x = M + wRes * i;
      doc.circle(x + 6, yRes + 6, 4).fill(color);
      doc
        .fillColor(pdf.tinta)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(String(n), x + 16, yRes, { continued: false });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(PDF_TENUE)
        .text(lbl, x + 16, yRes + 15, { width: wRes - 20 });
    });
    doc.y = yRes + 32;
    doc.x = M;

    // ── Tabla de puntos revisados ──
    pdf.seccion('Puntos revisados');

    const cEstatus = 90;
    const cPunto = 170;
    const cNota = ancho - cPunto - cEstatus;

    const encabezadoFila = () => {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF_TENUE);
      doc.text('Punto', M, y, { width: cPunto - 6 });
      doc.text('Estado', M + cPunto, y, { width: cEstatus - 6 });
      doc.text('Observaciones', M + cPunto + cEstatus, y, { width: cNota - 6 });
      doc.y = y + 12;
      doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
      doc.moveDown(0.3);
    };
    encabezadoFila();

    if (puntos.length) {
      for (const p of puntos) {
        if (doc.y > doc.page.height - 70) {
          doc.addPage();
          encabezadoFila();
        }
        const y = doc.y;
        const est = ESTATUS[p.status] ?? { label: p.status, color: PDF_TENUE };
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(pdf.tinta)
          .text(p.item?.name ?? 'Punto', M, y, { width: cPunto - 6 });
        const alto = doc.y - y;
        // Semáforo: círculo de color + etiqueta.
        doc.circle(M + cPunto + 4, y + 5, 3.5).fill(est.color);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(est.color)
          .text(est.label, M + cPunto + 12, y, { width: cEstatus - 14 });
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(p.notes ? pdf.tinta : PDF_TENUE)
          .text(p.notes || '—', M + cPunto + cEstatus, y, { width: cNota - 6 });
        doc.y = y + Math.max(alto, doc.y - y, 13);
      }
    } else {
      doc.fontSize(9).fillColor(PDF_TENUE).text('Sin puntos revisados capturados.', M, doc.y);
      doc.moveDown(0.5);
    }

    pdf.nota(
      'Este informe refleja el estado observado de los puntos revisados al momento del ' +
        'servicio. Los puntos marcados en ámbar conviene vigilarlos; los marcados en rojo se ' +
        'recomienda atenderlos a la brevedad por seguridad. Cualquier trabajo adicional se ' +
        'cotiza y autoriza por separado.',
    );

    pdf.firmas([
      ['Técnico responsable', tecnico],
      ['Enterado — cliente', cliente],
    ]);

    pdf.pieDePagina(`Revisión ${so.folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `${so.folio}-revision.pdf`,
      folio: so.folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Taller',
      clientEmail: (cli?.['email'] as string) ?? null,
    };
  }
}
