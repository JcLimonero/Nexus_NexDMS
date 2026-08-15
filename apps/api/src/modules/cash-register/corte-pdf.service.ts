import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { CashSession } from './entities/cash-session.entity';
import {
  CashMovement,
  CashMovementKindEnum,
} from './entities/cash-movement.entity';

const M = 40;
const TINTA = '#16262F';
const TENUE = '#5A6B78';
const MARCA = '#203848';
const LINEA = '#DDE3E9';

const MOVIMIENTO: Record<string, string> = {
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Retiro',
  EXPENSE: 'Gasto',
};

/**
 * Corte de caja imprimible.
 *
 * Es lo que el cajero firma al cerrar y entrega con el efectivo: fondo,
 * ventas por método, movimientos, arqueo por denominaciones, y el esperado
 * contra lo contado con su diferencia. En media carta, para que quepa en la
 * gaveta con el dinero.
 */
@Injectable()
export class CortePdfService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepo: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
  ) {}

  private dinero(n: number): string {
    return n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  private fecha(d: Date | string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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

    // Media carta vertical: el corte va en la gaveta con el efectivo.
    const doc = new PDFDocument({ size: [396, 612], margin: M });
    const trozos: Buffer[] = [];
    doc.on('data', (c: Buffer) => trozos.push(c));
    const fin = new Promise<Buffer>((r) =>
      doc.on('end', () => r(Buffer.concat(trozos))),
    );
    const ancho = doc.page.width - M * 2;

    const nombre = s.user
      ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim()
      : '';

    doc.fontSize(13).font('Helvetica-Bold').fillColor(MARCA);
    doc.text('Corte de caja', M, M);
    doc.fontSize(8).font('Helvetica').fillColor(TENUE);
    doc.text(
      `${s.branch?.name ?? ''} · ${nombre} · ${s.status === 'OPEN' ? 'ABIERTA' : 'cerrada'}`,
    );
    doc.text(`Apertura: ${this.fecha(s.openedAt)}`);
    doc.text(`Cierre: ${this.fecha(s.closedAt)}`);
    doc.text(`Impreso: ${this.fecha(new Date())}`);

    doc.moveDown(0.5);
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(LINEA).stroke();
    doc.moveDown(0.5);

    const linea = (etq: string, val: string, fuerte = false) => {
      const y = doc.y;
      doc
        .font(fuerte ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fuerte ? 11 : 9)
        .fillColor(fuerte ? MARCA : TENUE)
        .text(etq, M, y, { width: ancho * 0.62 });
      doc
        .fillColor(fuerte ? MARCA : TINTA)
        .text(val, M + ancho * 0.62, y, {
          width: ancho * 0.38,
          align: 'right',
        });
      doc.y = y + (fuerte ? 16 : 13);
    };

    const fondo = Number(s.openingBalance);
    const efectivoVentas = Number(s.totalCash);
    const neto = movs.reduce((a, m) => {
      const v = Number(m.amount);
      return m.kind === CashMovementKindEnum.DEPOSIT ? a + v : a - v;
    }, 0);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(MARCA).text('Ventas del turno');
    doc.moveDown(0.2);
    linea('Efectivo', this.dinero(efectivoVentas));
    linea('Tarjeta', this.dinero(Number(s.totalCard)));
    linea('Transferencia', this.dinero(Number(s.totalTransfer)));
    linea('Total ventas', this.dinero(Number(s.totalSales)));
    doc.moveDown(0.3);

    if (movs.length) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MARCA).text('Movimientos de efectivo');
      doc.moveDown(0.2);
      for (const m of movs) {
        const signo = m.kind === CashMovementKindEnum.DEPOSIT ? '+' : '−';
        linea(
          `${MOVIMIENTO[m.kind]} · ${m.concept}`,
          `${signo} ${this.dinero(Number(m.amount))}`,
        );
      }
      doc.moveDown(0.3);
    }

    if (s.denominations && Object.keys(s.denominations).length) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MARCA).text('Arqueo');
      doc.moveDown(0.2);
      Object.entries(s.denominations)
        .filter(([, n]) => Number(n) > 0)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .forEach(([valor, piezas]) => {
          linea(
            `${this.dinero(Number(valor))} × ${piezas}`,
            this.dinero(Number(valor) * Number(piezas)),
          );
        });
      doc.moveDown(0.3);
    }

    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(LINEA).stroke();
    doc.moveDown(0.4);

    linea('Fondo de apertura', this.dinero(fondo));
    linea('+ Efectivo de ventas', this.dinero(efectivoVentas));
    if (neto) linea('± Movimientos', this.dinero(neto));
    linea(
      'Efectivo esperado',
      this.dinero(
        s.expectedCash !== null
          ? Number(s.expectedCash)
          : fondo + efectivoVentas + neto,
      ),
      true,
    );
    if (s.countedCash !== null) {
      linea('Efectivo contado', this.dinero(Number(s.countedCash)), true);
      const dif = Number(s.difference);
      linea(
        dif === 0 ? 'Sin diferencia' : dif > 0 ? 'Sobrante' : 'Faltante',
        this.dinero(Math.abs(dif)),
        true,
      );
    }

    if (s.closingNotes) {
      doc.moveDown(0.4);
      doc.fontSize(7).fillColor(TENUE).text(`Notas: ${s.closingNotes}`, {
        width: ancho,
      });
    }

    // Firmas
    doc.moveDown(2);
    const y = doc.y;
    const w = (ancho - 20) / 2;
    [
      ['Entrega (cajero)', nombre],
      ['Recibe', ''],
    ].forEach(([rot, val], i) => {
      const x = M + (w + 20) * i;
      doc.moveTo(x, y).lineTo(x + w, y).strokeColor(TENUE).lineWidth(0.7).stroke();
      doc.fontSize(7).fillColor(TENUE).text(rot, x, y + 4, { width: w });
      if (val) doc.fontSize(8).fillColor(TINTA).text(val, x, y + 13, { width: w });
    });

    doc.end();
    return {
      buffer: await fin,
      filename: `corte-${s.branch?.slug ?? 'caja'}-${sessionId.slice(0, 8)}.pdf`,
    };
  }
}
