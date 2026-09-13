import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UnitSale } from './entities/unit-sale.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PdfDoc, PDF_TENUE, descargarLogo } from '../../common/pdf/pdf-doc';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';

/**
 * Contrato de compraventa de una unidad.
 *
 * PLANTILLA ilustrativa: el texto de las cláusulas es genérico y lleva marca de
 * agua "Solo para fines ilustrativos", porque cada cliente querrá definir el
 * suyo (ver PENDIENTES: texto de contrato configurable por tenant). Los datos
 * (partes, unidad, precio) sí salen reales de la venta.
 */
@Injectable()
export class ContratoCompraventaPdfService {
  constructor(
    @InjectRepository(UnitSale) private readonly saleRepo: Repository<UnitSale>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
    private readonly plantillas: DocumentTemplatesService,
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

    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const sucursal = await this.branchRepo.findOne({
      where: { tenantId, isPrimary: true },
    });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;
    const logo = await descargarLogo(this.storage, sucursal?.logoKey, t?.logoKey);

    const pdf = new PdfDoc({ paletteId: t?.palette });
    const { doc, M, ancho } = pdf;

    const cli = venta.client;
    const comprador = cli
      ? cli.companyName || `${cli.firstName ?? ''} ${cli.lastName ?? ''}`.trim()
      : '________________________';
    const vendedor = razon?.name ?? sucursal?.name ?? 'El Vendedor';
    const u = venta.catalogUnit as unknown as Record<string, unknown> | undefined;
    const unidad = [u?.['brand'], u?.['model'], u?.['year'], u?.['version']]
      .filter(Boolean)
      .join(' ');

    const senas = [
      sucursal?.name,
      sucursal?.address,
      [sucursal?.city, sucursal?.state].filter(Boolean).join(', '),
      razon?.rfc ? `RFC ${razon.rfc}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    pdf.encabezado({
      titulo: 'Contrato de compraventa',
      folio: venta.folio,
      entidad: vendedor,
      senas,
      logo,
      meta: [
        ['Fecha', pdf.fecha(venta.createdAt)],
        ['Lugar', [sucursal?.city, sucursal?.state].filter(Boolean).join(', ')],
        ['Folio', venta.folio],
      ],
    });

    const parrafo = (texto: string, gap = 0.5) => {
      doc.fontSize(9).font('Helvetica').fillColor(pdf.tinta).text(texto, M, doc.y, {
        width: ancho,
        align: 'left',
      });
      doc.moveDown(gap);
    };

    parrafo(
      `Contrato de compraventa de vehículo que celebran, por una parte, ${vendedor} ` +
        `(en adelante "El Vendedor"), y por la otra, ${comprador}` +
        `${cli?.rfc ? ` con RFC ${cli.rfc}` : ''} (en adelante "El Comprador"), ` +
        `al tenor de las siguientes declaraciones y cláusulas.`,
    );

    pdf.seccion('Datos de la unidad');
    pdf.campos(
      [
        ['Unidad', unidad],
        ['Año', String(u?.['year'] ?? '')],
        ['Color', (u?.['color'] as string) ?? ''],
        ['No. de serie', (u?.['serialNumber'] as string) ?? ''],
        ['No. de motor', (u?.['engineNumber'] as string) ?? ''],
        ['Versión', (u?.['version'] as string) ?? ''],
      ],
      3,
    );

    pdf.seccion('Precio y forma de pago');
    const precio = Number(venta.finalPrice) || 0;
    const enganche = Number(venta.downPayment) || 0;
    const saldo = Math.max(precio - enganche, 0);
    pdf.campos(
      [
        ['Precio total', pdf.dinero(precio)],
        ['Enganche / anticipo', pdf.dinero(enganche)],
        ['Saldo', pdf.dinero(saldo)],
        ['Financiamiento', venta.bankFolio ? `Folio ${venta.bankFolio}` : 'Contado'],
      ],
      3,
    );

    // Cláusulas: si el cliente definió su propio texto, se usa ese (su contrato
    // real, sin marca de agua). Si no, la plantilla genérica ilustrativa.
    const propio = await this.plantillas.obtenerHtml(
      tenantId,
      'contract-unit-sale',
    );

    pdf.seccion('Cláusulas');
    if (propio) {
      pdf.html(propio);
    } else {
      const clausulas = [
        `PRIMERA. Objeto. El Vendedor vende y El Comprador adquiere la unidad descrita, en el estado en que se encuentra y que El Comprador declara conocer y aceptar.`,
        `SEGUNDA. Precio. El precio total es de ${pdf.dinero(precio)} (moneda nacional). El Comprador cubre un enganche de ${pdf.dinero(enganche)} y un saldo de ${pdf.dinero(saldo)} conforme a lo pactado.`,
        `TERCERA. Entrega. El Vendedor entrega la unidad y la documentación que ampara su legal propiedad al momento de liquidar el saldo, salvo pacto distinto por escrito.`,
        `CUARTA. Garantía. La unidad se vende con la garantía que en su caso otorgue el fabricante o la que por escrito ofrezca El Vendedor; no se otorgan garantías adicionales implícitas.`,
        `QUINTA. Gastos e impuestos. Los gastos de traslado de dominio, tenencias, refrendos e impuestos que se generen a partir de la entrega corren por cuenta de El Comprador.`,
        `SEXTA. Jurisdicción. Para la interpretación y cumplimiento de este contrato, las partes se someten a los tribunales competentes del domicilio de El Vendedor, renunciando a cualquier otro fuero.`,
      ];
      clausulas.forEach((c) => parrafo(c, 0.4));
    }

    pdf.firmas([
      ['El Vendedor', vendedor],
      ['El Comprador', comprador],
    ]);

    if (!propio) {
      doc
        .fontSize(7)
        .fillColor(PDF_TENUE)
        .text(
          'Plantilla ilustrativa. El texto definitivo del contrato lo define cada negocio.',
          M,
          doc.y + 4,
          { width: ancho },
        );
    }

    pdf.pieDePagina(`Contrato ${venta.folio}`);
    if (!propio) pdf.marcaDeAgua('Solo para fines ilustrativos');

    return {
      buffer: await pdf.finalizar(),
      filename: `contrato-${venta.folio}.pdf`,
      folio: venta.folio,
      negocio: vendedor,
      clientEmail: cli?.email ?? null,
    };
  }
}
