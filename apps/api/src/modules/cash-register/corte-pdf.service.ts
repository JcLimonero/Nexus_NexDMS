import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { CashSession } from './entities/cash-session.entity';
import {
  CashMovement,
  CashMovementKindEnum,
} from './entities/cash-movement.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, PDF_LINEA } from '../../common/pdf/pdf-doc';

const MOVIMIENTO: Record<string, string> = {
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Retiro',
  EXPENSE: 'Gasto',
};

/**
 * Corte de caja imprimible.
 *
 * Es lo que el cajero firma al cerrar y entrega con el efectivo: fondo, ventas
 * por método, movimientos, arqueo por denominaciones, y el esperado contra lo
 * contado con su diferencia. En media carta, para que quepa en la gaveta con el
 * dinero. Comparte la identidad de marca (logo/colores del tenant) con el resto
 * de las impresiones vía `PdfDoc`.
 */
@Injectable()
export class CortePdfService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepo: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    user: UserPayload,
    sessionId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const s = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId: user.tenantId },
      relations: ['branch', 'user'],
    });
    if (!s) throw new NotFoundException('Sesión no encontrada');
    const movs = await this.movementRepo.find({
      where: { cashSessionId: sessionId },
      order: { createdAt: 'ASC' },
    });

    const t = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
    let logo: Buffer | null = null;
    if (t?.logoKey) {
      try {
        logo = await this.storage.download(t.logoKey);
      } catch {
        logo = null;
      }
    }

    // Media carta vertical: el corte va en la gaveta con el efectivo.
    const pdf = new PdfDoc({ size: [396, 612], paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const nombre = s.user
      ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim()
      : '';
    const senas = [
      s.branch?.address,
      [s.branch?.city, s.branch?.state].filter(Boolean).join(', '),
      s.branch?.counterPhone ? `Tel. ${s.branch.counterPhone}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    pdf.encabezado({
      titulo: 'Corte de caja',
      estatus: s.status === 'OPEN' ? 'ABIERTA' : 'Cerrada',
      entidad: s.branch?.name ?? 'Caja',
      senas,
      logo,
      meta: [
        ['Cajero', nombre],
        ['Apertura', pdf.fecha(s.openedAt)],
        ['Cierre', pdf.fecha(s.closedAt)],
        ['Impreso', pdf.impresion()],
      ],
    });

    // Línea etiqueta→valor a todo lo ancho (formato de ticket, no de tabla).
    const linea = (etq: string, val: string, fuerte = false) => {
      const y = doc.y;
      doc
        .font(fuerte ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fuerte ? 11 : 9)
        .fillColor(fuerte ? pdf.marca : PDF_TENUE)
        .text(etq, M, y, { width: ancho * 0.62 });
      doc
        .fillColor(fuerte ? pdf.marca : pdf.tinta)
        .text(val, M + ancho * 0.62, y, { width: ancho * 0.38, align: 'right' });
      doc.y = y + (fuerte ? 16 : 13);
    };

    const fondo = Number(s.openingBalance);
    const efectivoVentas = Number(s.totalCash);
    const neto = movs.reduce((a, m) => {
      const v = Number(m.amount);
      return m.kind === CashMovementKindEnum.DEPOSIT ? a + v : a - v;
    }, 0);

    pdf.seccion('Ventas del turno');
    linea('Efectivo', pdf.dinero(efectivoVentas));
    linea('Tarjeta', pdf.dinero(s.totalCard));
    linea('Transferencia', pdf.dinero(s.totalTransfer));
    linea('Total ventas', pdf.dinero(s.totalSales));
    doc.moveDown(0.3);

    if (movs.length) {
      pdf.seccion('Movimientos de efectivo');
      for (const m of movs) {
        const signo = m.kind === CashMovementKindEnum.DEPOSIT ? '+' : '−';
        linea(
          `${MOVIMIENTO[m.kind]} · ${m.concept}`,
          `${signo} ${pdf.dinero(m.amount)}`,
        );
      }
      doc.moveDown(0.3);
    }

    if (s.denominations && Object.keys(s.denominations).length) {
      pdf.seccion('Arqueo');
      Object.entries(s.denominations)
        .filter(([, n]) => Number(n) > 0)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .forEach(([valor, piezas]) => {
          linea(
            `${pdf.dinero(Number(valor))} × ${piezas}`,
            pdf.dinero(Number(valor) * Number(piezas)),
          );
        });
      doc.moveDown(0.3);
    }

    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(PDF_LINEA).stroke();
    doc.moveDown(0.4);

    linea('Fondo de apertura', pdf.dinero(fondo));
    linea('+ Efectivo de ventas', pdf.dinero(efectivoVentas));
    if (neto) linea('± Movimientos', pdf.dinero(neto));
    linea(
      'Efectivo esperado',
      pdf.dinero(
        s.expectedCash !== null
          ? Number(s.expectedCash)
          : fondo + efectivoVentas + neto,
      ),
      true,
    );
    if (s.countedCash !== null) {
      linea('Efectivo contado', pdf.dinero(s.countedCash), true);
      const dif = Number(s.difference);
      linea(
        dif === 0 ? 'Sin diferencia' : dif > 0 ? 'Sobrante' : 'Faltante',
        pdf.dinero(Math.abs(dif)),
        true,
      );
    }

    if (s.closingNotes) {
      doc.moveDown(0.4);
      doc
        .fontSize(7)
        .fillColor(PDF_TENUE)
        .text(`Notas: ${s.closingNotes}`, { width: ancho });
    }

    pdf.firmas([
      ['Entrega (cajero)', nombre],
      ['Recibe', ''],
    ]);

    pdf.pieDePagina(`Corte · ${s.branch?.name ?? 'Caja'}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `corte-${s.branch?.slug ?? 'caja'}-${sessionId.slice(0, 8)}.pdf`,
    };
  }
}
