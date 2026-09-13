import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UnitSalePayment } from './entities/unit-sale-payment.entity';
import { UnitSale } from './entities/unit-sale.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, descargarLogo } from '../../common/pdf/pdf-doc';

const KIND: Record<string, string> = {
  APARTADO: 'Apartado',
  ENGANCHE: 'Enganche',
  PARCIAL: 'Abono parcial',
  LIQUIDACION: 'Liquidación',
};

const METODO: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

/**
 * Recibo de pago (abono/enganche de una venta de unidad).
 *
 * Es el comprobante operativo —no fiscal— que se entrega al cliente cuando
 * abona: cuánto pagó, por qué concepto, y cómo queda el saldo. Comparte la
 * identidad del resto de las impresiones (`PdfDoc`).
 */
@Injectable()
export class ReciboPagoPdfService {
  constructor(
    @InjectRepository(UnitSalePayment)
    private readonly payRepo: Repository<UnitSalePayment>,
    @InjectRepository(UnitSale)
    private readonly saleRepo: Repository<UnitSale>,
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
    paymentId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const pago = await this.payRepo.findOne({
      where: { id: paymentId, tenantId },
      relations: ['unitSale', 'unitSale.client', 'unitSale.catalogUnit'],
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    const venta = pago.unitSale;

    // Todos los abonos de la venta, para el saldo.
    const pagos = await this.payRepo.find({
      where: { unitSaleId: pago.unitSaleId },
    });
    const abonado = pagos.reduce((a, p) => a + Number(p.amount), 0);
    const precio = Number(venta?.finalPrice) || 0;
    const saldo = Math.max(precio - abonado, 0);

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    // La venta no cuelga de una sucursal: se usa la matriz para el encabezado.
    const sucursal = await this.branchRepo.findOne({
      where: { tenantId, isPrimary: true },
    });
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

    const cli = venta?.client;
    const nombre = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    const u = venta?.catalogUnit as unknown as Record<string, unknown> | undefined;
    const unidad = [u?.['brand'], u?.['model'], u?.['year'], u?.['version']]
      .filter(Boolean)
      .join(' ');

    pdf.encabezado({
      titulo: 'Recibo de pago',
      folio: pago.reference || `REC-${paymentId.slice(0, 8).toUpperCase()}`,
      estatus: KIND[pago.kind] ?? pago.kind,
      entidad: razon?.name ?? sucursal?.name ?? 'Recibo',
      senas,
      logo,
      meta: [
        ['Fecha de pago', pdf.soloFecha(pago.paidDate)],
        ['Método', METODO[pago.method] ?? pago.method],
        ['Venta (folio)', venta?.folio ?? ''],
        ['Concepto', KIND[pago.kind] ?? pago.kind],
        ['Referencia', pago.reference ?? '—'],
        ['Impreso', pdf.impresion()],
      ],
    });

    // Monto recibido, en grande.
    pdf.seccion('Recibimos de');
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(pdf.tinta)
      .text(nombre || '—', M, doc.y, { width: ancho });
    doc.moveDown(0.2);
    doc.fontSize(7).font('Helvetica').fillColor(PDF_TENUE).text('LA CANTIDAD DE');
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor(pdf.marca)
      .text(pdf.dinero(pago.amount), { width: ancho });
    doc.moveDown(0.4);

    // Datos del cliente y la unidad.
    pdf.seccion('Detalle');
    pdf.campos(
      [
        ['Cliente', nombre],
        ['RFC', cli?.rfc ?? ''],
        ['Teléfono', cli?.phone ?? ''],
        ['Unidad', unidad],
        ['Color', (u?.['color'] as string) ?? ''],
        ['Venta', venta?.folio ?? ''],
      ],
      3,
    );
    if (pago.notes) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('NOTAS', M, doc.y);
      doc.fontSize(8.5).fillColor(pdf.tinta).text(pago.notes, { width: ancho });
      doc.moveDown(0.2);
    }

    // Estado de cuenta de la venta.
    pdf.divisorTotales();
    pdf.lineaTotal('Precio de la unidad', pdf.dinero(precio));
    pdf.lineaTotal('Total abonado', pdf.dinero(abonado));
    pdf.lineaTotal('Saldo pendiente', pdf.dinero(saldo), true);

    pdf.nota(
      'Comprobante de pago de carácter operativo, no es un comprobante fiscal (CFDI). ' +
        'Conserve este recibo hasta la liquidación de la unidad.',
    );

    pdf.firmas([
      ['Recibí conforme', ''],
      ['Cliente', nombre],
    ]);

    pdf.pieDePagina(`Recibo · Venta ${venta?.folio ?? ''}`);

    const folioDoc = pago.reference || paymentId.slice(0, 8);
    return {
      buffer: await pdf.finalizar(),
      filename: `recibo-${folioDoc}.pdf`,
      folio: folioDoc,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: cli?.email ?? null,
    };
  }
}
