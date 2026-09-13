import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UnitSale } from './entities/unit-sale.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { PaymentPlanInstallment } from './entities/payment-plan-installment.entity';
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

const ESTATUS_PLAN: Record<string, string> = {
  ACTIVE: 'Vigente',
  PAID_OFF: 'Liquidado',
  OVERDUE: 'Con atraso',
};

const ESTATUS_MENS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
};

/**
 * Plan de pagos (tabla de amortización) de una venta de unidad a crédito.
 *
 * El calendario que se lleva el cliente: cuánto y cuándo paga cada mensualidad,
 * qué lleva pagado y cuánto le resta. Comparte la identidad del resto de las
 * impresiones (`PdfDoc`).
 */
@Injectable()
export class PlanPagosPdfService {
  constructor(
    @InjectRepository(UnitSale) private readonly saleRepo: Repository<UnitSale>,
    @InjectRepository(PaymentPlan)
    private readonly planRepo: Repository<PaymentPlan>,
    @InjectRepository(PaymentPlanInstallment)
    private readonly installmentRepo: Repository<PaymentPlanInstallment>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    unitSaleId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const venta = await this.saleRepo.findOne({
      where: { id: unitSaleId, tenantId },
      relations: ['client', 'catalogUnit'],
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const plan = await this.planRepo.findOne({ where: { unitSaleId } });
    if (!plan) throw new NotFoundException('La venta no tiene plan de pagos');

    const mensualidades = await this.installmentRepo.find({
      where: { paymentPlanId: plan.id },
      order: { installmentNumber: 'ASC' },
    });

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = venta.catalogUnit?.branchId
      ? await this.branchRepo.findOne({
          where: { id: venta.catalogUnit.branchId },
        })
      : await this.branchRepo.findOne({ where: { tenantId, isPrimary: true } });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const cli = venta.client;
    const cliente = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    const u = venta.catalogUnit;

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
      titulo: 'Plan de pagos',
      folio: venta.folio,
      estatus: ESTATUS_PLAN[plan.status] ?? plan.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.soloFecha(plan.createdAt)],
        ['Plazo', `${plan.installmentCount} mensualidades`],
        ['Tasa de interés', `${Number(plan.interestRate).toFixed(2)}%`],
        ['Primer pago', pdf.soloFecha(plan.firstPaymentDate)],
        ['Cliente', cliente],
        ['Impreso', pdf.impresion()],
      ],
    });

    // ── Unidad ──
    pdf.seccion('Unidad');
    pdf.campos(
      [
        ['Unidad', [u?.brand, u?.model, u?.year].filter(Boolean).join(' ')],
        ['Color', u?.color ?? ''],
        ['Número de serie', u?.serialNumber ?? ''],
      ],
      3,
    );

    // ── Resumen financiero ──
    pdf.seccion('Resumen del financiamiento');
    const precio = Number(venta.finalPrice) || 0;
    const enganche = Number(venta.downPayment) || 0;
    pdf.lineaTotal('Precio de la unidad', pdf.dinero(precio));
    if (enganche) pdf.lineaTotal('Enganche', pdf.dinero(enganche));
    pdf.lineaTotal(
      `Mensualidad (${plan.installmentCount})`,
      pdf.dinero(plan.monthlyAmount),
    );
    pdf.lineaTotal('Total a pagar del plan', pdf.dinero(plan.totalAmount), true);

    // ── Tabla de amortización ──
    pdf.seccion('Calendario de pagos');

    const cNum = 30;
    const cVence = 90;
    const cMonto = 90;
    const cPago = 90;
    const cEstatus = ancho - cNum - cVence - cMonto - cPago;

    const fila = (
      celdas: [string, string, string, string, string],
      opciones: { negrita?: boolean; tenue?: boolean } = {},
    ) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const y = doc.y;
      doc
        .font(opciones.negrita ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .fillColor(opciones.tenue ? PDF_TENUE : pdf.tinta);
      doc.text(celdas[0], M, y, { width: cNum });
      doc.text(celdas[1], M + cNum, y, { width: cVence - 6 });
      doc.text(celdas[2], M + cNum + cVence, y, { width: cMonto - 6, align: 'right' });
      doc.text(celdas[3], M + cNum + cVence + cMonto, y, { width: cEstatus - 6 });
      doc.text(celdas[4], M + cNum + cVence + cMonto + cEstatus, y, {
        width: cPago - 6,
      });
      doc.y = y + 12;
    };

    fila(['#', 'Vence', 'Monto', 'Estatus', 'Pagada'], {
      negrita: true,
      tenue: true,
    });
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
    doc.moveDown(0.3);

    let pagado = 0;
    let saldo = 0;
    for (const m of mensualidades) {
      const monto = Number(m.amount) || 0;
      if (m.status === 'PAID') pagado += monto;
      else saldo += monto;
      fila([
        String(m.installmentNumber),
        pdf.soloFecha(m.dueDate),
        pdf.dinero(monto),
        ESTATUS_MENS[m.status] ?? m.status,
        m.paidDate ? pdf.soloFecha(m.paidDate) : '—',
      ]);
    }
    if (!mensualidades.length) {
      fila(['—', 'Sin mensualidades', '', '', ''], { tenue: true });
    }

    // ── Totales del plan ──
    pdf.divisorTotales();
    pdf.lineaTotal('Pagado', pdf.dinero(pagado));
    pdf.lineaTotal('Saldo por pagar', pdf.dinero(saldo), true);

    pdf.nota(
      'Montos en moneda nacional. El calendario refleja el estado a la fecha de impresión; ' +
        'los intereses moratorios y cargos por pago tardío, si aplican, se rigen por lo pactado. ' +
        'Conserve sus comprobantes de pago.',
    );

    // ── Firma ──
    pdf.firmas([['Enterado — cliente', cliente]]);

    pdf.pieDePagina(`Plan de pagos ${venta.folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `${venta.folio}.pdf`,
      folio: venta.folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: cli?.email ?? null,
    };
  }
}
