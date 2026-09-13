import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UnitReservation } from './entities/unit-reservation.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, descargarLogo } from '../../common/pdf/pdf-doc';

const ESTATUS: Record<string, string> = {
  ACTIVE: 'Vigente',
  CONVERTED: 'Convertido en venta',
  RELEASED: 'Liberado',
};

/**
 * Comprobante de apartado / reservación de unidad.
 *
 * Acuse de que el cliente dejó un anticipo para reservar una unidad: qué unidad,
 * cuánto entregó y cuánto queda por pagar, y bajo qué condiciones. Comparte la
 * identidad del resto de las impresiones (`PdfDoc`). Si el apartado se liberó,
 * deja constancia del motivo.
 */
@Injectable()
export class ComprobanteApartadoPdfService {
  constructor(
    @InjectRepository(UnitReservation)
    private readonly reservationRepo: Repository<UnitReservation>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  async generar(
    tenantId: string,
    reservationId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    folio: string;
    negocio: string;
    clientEmail: string | null;
  }> {
    const r = await this.reservationRepo.findOne({
      where: { id: reservationId, tenantId },
      relations: ['catalogUnit', 'client'],
    });
    if (!r) throw new NotFoundException('Apartado no encontrado');

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = r.catalogUnit?.branchId
      ? await this.branchRepo.findOne({ where: { id: r.catalogUnit.branchId } })
      : null;
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const quien = r.userId
      ? await this.userRepo.findOne({ where: { id: r.userId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const folio = r.folio ?? r.id.slice(0, 8).toUpperCase();
    const cli = r.client;
    const cliente = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '';
    const u = r.catalogUnit;
    const atendio = quien
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
      titulo: 'Comprobante de apartado',
      folio,
      estatus: ESTATUS[r.status] ?? r.status,
      entidad: razon?.name ?? sucursal?.name ?? 'Negocio',
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(r.createdAt)],
        ['Atendió', atendio],
        ['Impreso', pdf.impresion()],
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

    // ── Unidad apartada ──
    pdf.seccion('Unidad apartada');
    pdf.campos(
      [
        ['Unidad', [u?.brand, u?.model, u?.year].filter(Boolean).join(' ')],
        ['Versión', u?.version ?? ''],
        ['Color', u?.color ?? ''],
        ['Número de serie', u?.serialNumber ?? ''],
      ],
      2,
    );

    // ── Montos ──
    pdf.seccion('Montos');
    const precio = Number(u?.salePrice) || 0;
    const anticipo = Number(r.advanceAmount) || 0;
    const saldo = Math.max(0, precio - anticipo);
    pdf.lineaTotal('Precio de la unidad', pdf.dinero(precio));
    pdf.lineaTotal('Anticipo recibido', pdf.dinero(anticipo), true);
    if (precio > 0) pdf.lineaTotal('Saldo por pagar', pdf.dinero(saldo));

    // ── Notas / liberación ──
    doc.moveDown(0.4);
    if (r.notes) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('NOTAS', M, doc.y);
      doc.fontSize(8.5).fillColor(pdf.tinta).text(r.notes, { width: ancho });
      doc.moveDown(0.3);
    }
    if (r.status === 'RELEASED' && r.releaseReason) {
      doc.fontSize(6.5).fillColor(PDF_TENUE).text('MOTIVO DE LIBERACIÓN', M, doc.y);
      doc.fontSize(8.5).fillColor(pdf.tinta).text(r.releaseReason, { width: ancho });
      doc.moveDown(0.3);
    }

    pdf.nota(
      'Montos en moneda nacional. El anticipo reserva la unidad descrita durante el plazo ' +
        'acordado; el precio final puede ajustarse por promociones, accesorios o cargos aplicables ' +
        'al momento de la compra. Las condiciones de devolución del anticipo son las pactadas con ' +
        'el negocio.',
    );

    // ── Firmas ──
    pdf.firmas([
      ['Recibí de conformidad — cliente', cliente],
      ['Por el negocio', atendio],
    ]);

    pdf.pieDePagina(`Apartado ${folio}`);

    return {
      buffer: await pdf.finalizar(),
      filename: `${folio}.pdf`,
      folio,
      negocio: razon?.name ?? sucursal?.name ?? 'Negocio',
      clientEmail: cli?.email ?? null,
    };
  }
}
