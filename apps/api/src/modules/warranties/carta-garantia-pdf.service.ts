import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Warranty } from './entities/warranty.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, descargarLogo } from '../../common/pdf/pdf-doc';

const TIPO: Record<string, string> = {
  UNIT: 'Unidad',
  PART: 'Refacción',
  SERVICE: 'Servicio',
};

const ESTATUS: Record<string, string> = {
  OPEN: 'Vigente',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'Resuelta',
  REJECTED: 'Rechazada',
};

/**
 * Carta de garantía.
 *
 * El certificado que se entrega al cliente: qué ampara la garantía, desde y
 * hasta cuándo, y bajo qué condiciones. Comparte la identidad del resto de las
 * impresiones (`PdfDoc`). Si la garantía ya se atendió, deja constancia de la
 * resolución.
 */
@Injectable()
export class CartaGarantiaPdfService {
  constructor(
    @InjectRepository(Warranty)
    private readonly warrantyRepo: Repository<Warranty>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  /** Meses de cobertura entre dos fechas, redondeado. */
  private meses(desde: Date | string, hasta: Date | string): number {
    const a = new Date(desde);
    const b = new Date(hasta);
    const dias = (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(dias / 30));
  }

  async generar(
    tenantId: string,
    warrantyId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const w = await this.warrantyRepo.findOne({
      where: { id: warrantyId, tenantId },
      relations: ['client', 'vehicle', 'unitSale', 'serviceOrder', 'authorizer'],
    });
    if (!w) throw new NotFoundException('Garantía no encontrada');

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({ where: { id: w.branchId } });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const folio = w.folio ?? w.id.slice(0, 8).toUpperCase();
    const cli = w.client;
    const cliente = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    const v = w.vehicle;
    const autoriza = w.authorizer
      ? `${w.authorizer.firstName ?? ''} ${w.authorizer.lastName ?? ''}`.trim()
      : '';
    const origen = w.unitSale?.folio
      ? `Venta ${w.unitSale.folio}`
      : w.serviceOrder?.folio
        ? `Orden ${w.serviceOrder.folio}`
        : '—';

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
      titulo: 'Carta de garantía',
      folio,
      estatus: ESTATUS[w.status] ?? w.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Emitida', pdf.soloFecha(w.createdAt)],
        ['Tipo de garantía', TIPO[w.type] ?? w.type],
        ['Origen', origen],
        ['Autorizó', autoriza],
        ['Impresa', pdf.impresion()],
      ],
    });

    // ── Cliente ──
    pdf.seccion('Cliente');
    pdf.campos(
      [
        ['Nombre o razón social', cliente],
        ['RFC', cli?.rfc ?? ''],
        ['Teléfono', cli?.phone ?? ''],
        ['Correo', cli?.email ?? ''],
      ],
      2,
    );

    // ── Vehículo / bien amparado ──
    pdf.seccion('Bien amparado');
    pdf.campos(
      [
        ['Unidad', [v?.make, v?.model, v?.year].filter(Boolean).join(' ')],
        ['Placas', v?.plate ?? ''],
        ['Color', v?.color ?? ''],
        ['Número de serie', v?.vin ?? ''],
      ],
      2,
    );

    // ── Cobertura ──
    pdf.seccion('Cobertura');
    const meses = this.meses(w.startDate, w.endDate);
    pdf.campos(
      [
        ['Inicio', pdf.soloFecha(w.startDate)],
        ['Vencimiento', pdf.soloFecha(w.endDate)],
        ['Vigencia', meses ? `${meses} meses` : '—'],
      ],
      3,
    );
    doc.fontSize(6.5).fillColor(PDF_TENUE).text('QUÉ AMPARA', M, doc.y);
    doc
      .fontSize(9)
      .fillColor(pdf.tinta)
      .text(w.description || '—', M, doc.y, { width: ancho });
    doc.moveDown(0.4);

    // ── Resolución (si ya se atendió) ──
    if (w.resolution) {
      pdf.seccion('Resolución');
      doc
        .fontSize(9)
        .fillColor(pdf.tinta)
        .text(w.resolution, M, doc.y, { width: ancho });
      doc.moveDown(0.4);
    }

    // ── Condiciones ──
    pdf.seccion('Condiciones de la garantía');
    doc
      .fontSize(8)
      .fillColor(pdf.tinta)
      .text(
        'Esta garantía ampara únicamente el bien y los conceptos descritos, dentro de la ' +
          'vigencia indicada. No cubre daños por mal uso, negligencia, accidente, alteración o ' +
          'reparación por terceros ajenos, ni el desgaste normal ni los consumibles. Para hacerla ' +
          'válida, el cliente debe presentar esta carta y el vehículo en la sucursal emisora. La ' +
          'atención de una reclamación no extiende la vigencia original.',
        M,
        doc.y,
        { width: ancho },
      );
    doc.moveDown(0.4);

    // ── Firmas ──
    pdf.firmas([
      ['Por el negocio', autoriza],
      ['Enterado — cliente', cliente],
    ]);

    pdf.pieDePagina(`Garantía ${folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `garantia-${folio}.pdf`,
      folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: cli?.email ?? null,
    };
  }
}
