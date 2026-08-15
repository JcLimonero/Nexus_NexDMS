import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';

import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderOperation } from './entities/service-order-operation.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ReceptionPhoto } from './entities/reception-photo.entity';
import {
  ReceptionPhotoMark,
  ReceptionPhotoSpec,
} from './entities/reception-catalog.entities';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { paletaPorId } from '../tenants/branding.paletas';
import { Part } from '../parts/entities/part.entity';

/** Etiquetas de los daños, las mismas que ve el asesor en la pantalla. */
const DANOS: Record<string, string> = {
  SCRATCH: 'Rayón',
  DENT: 'Golpe',
  BROKEN: 'Roto',
  MISSING: 'Faltante',
  WEAR: 'Desgaste',
  OTHER: 'Otro',
};

const ESTATUS: Record<string, string> = {
  RECEIVED: 'Recibida',
  IN_DIAGNOSIS: 'En diagnóstico',
  IN_PROGRESS: 'En reparación',
  WAITING_PARTS: 'Esperando refacciones',
  WAITING_APPROVAL: 'Esperando autorización',
  READY: 'Lista para entrega',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

/** Márgenes y tipografías, en un solo sitio para no descuadrar el documento. */
const M = 40;
const TENUE = '#5A6B78';
const LINEA = '#DDE3E9';

/**
 * Los dos colores que aporta la marca del cliente: la tinta de los textos y el
 * color de las bandas de sección. Viajan por el documento en vez de ser
 * constantes globales: dos órdenes de clientes distintos pueden imprimirse a
 * la vez, y una constante reasignada por petición teñiría una con los colores
 * de la otra.
 */
interface ColoresMarca {
  tinta: string;
  marca: string;
}

/**
 * Orden de servicio en papel.
 *
 * Es el documento que el cliente firma al dejar la unidad y con el que se
 * discute a la entrega, así que lleva las tres cosas que se reclaman: qué se
 * autorizó y cuánto cuesta, cómo llegó la unidad, y qué daños traía marcados.
 *
 * Se arma en el servidor y no en el navegador porque tiene que salir igual
 * desde el DMS, desde la tableta del mostrador y desde un correo, y porque
 * quien lo firma no debería poder cambiarlo antes de imprimirlo.
 */
@Injectable()
export class OrdenPdfService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ServiceOrderOperation)
    private readonly opRepo: Repository<ServiceOrderOperation>,
    @InjectRepository(ServiceOrderPart)
    private readonly partRepo: Repository<ServiceOrderPart>,
    @InjectRepository(Part)
    private readonly catalogoRepo: Repository<Part>,
    @InjectRepository(ReceptionChecklist)
    private readonly checklistRepo: Repository<ReceptionChecklist>,
    @InjectRepository(ReceptionPhoto)
    private readonly photoRepo: Repository<ReceptionPhoto>,
    @InjectRepository(ReceptionPhotoMark)
    private readonly markRepo: Repository<ReceptionPhotoMark>,
    @InjectRepository(ReceptionPhotoSpec)
    private readonly specRepo: Repository<ReceptionPhotoSpec>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalRepo: Repository<LegalEntity>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private dinero(n: number): string {
    return n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  /**
   * Fechas guardadas en la orden.
   *
   * Van SIN convertir de zona: la base las guarda como hora local del taller
   * —sin huso— y el contenedor corre en UTC, así que pedir una conversión les
   * restaría seis horas y la recepción de las 9:00 saldría impresa a las 3:00.
   */
  private fecha(d: Date | string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * El momento de imprimir, que sí es un instante real.
   *
   * Este necesita lo contrario que el anterior: `new Date()` es un instante
   * absoluto y el contenedor está en UTC, así que sin declarar el huso el
   * papel salía sellado seis horas en el futuro.
   */
  private impresion(): string {
    return new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async generar(
    tenantId: string,
    serviceOrderId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId },
      relations: ['vehicle', 'owner', 'user', 'mechanic'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    // La marca del cliente tiñe la tinta y las bandas del documento, para que
    // el papel se vea como el resto de su NexDMS.
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const paleta = paletaPorId(t?.palette);
    const c: ColoresMarca = { tinta: paleta.tinta, marca: paleta.primary };

    const sucursal = await this.branchRepo.findOne({
      where: { id: so.branchId },
    });
    const razon = sucursal?.legalEntityId
      ? await this.legalRepo.findOne({ where: { id: sucursal.legalEntityId } })
      : null;

    const operaciones = await this.opRepo.find({
      where: { serviceOrderId },
      order: { sortOrder: 'ASC' },
    });
    const refacciones = await this.partRepo.find({ where: { serviceOrderId } });
    // Las refacciones guardan el id del catálogo, no su nombre: sin esto el
    // cliente vería un identificador en vez de "Filtro de aceite".
    const catalogo = refacciones.length
      ? await this.catalogoRepo.findByIds(refacciones.map((p) => p.partId))
      : [];
    const nombreParte = new Map(catalogo.map((p) => [p.id, p]));

    const checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId },
    });
    const fotos = checklist
      ? await this.photoRepo.find({
          where: { receptionChecklistId: checklist.id },
          order: { createdAt: 'ASC' },
        })
      : [];
    const marcas = fotos.length
      ? await this.markRepo
          .createQueryBuilder('m')
          .where('m.reception_photo_id IN (:...ids)', {
            ids: fotos.map((f) => f.id),
          })
          .orderBy('m.created_at', 'ASC')
          .getMany()
      : [];
    const specs = await this.specRepo.find();
    const nombreSpec = new Map(specs.map((s) => [s.code, s.name]));

    const doc = new PDFDocument({ size: 'LETTER', margin: M, bufferPages: true });
    const trozos: Buffer[] = [];
    doc.on('data', (c: Buffer) => trozos.push(c));
    const fin = new Promise<Buffer>((r) =>
      doc.on('end', () => r(Buffer.concat(trozos))),
    );

    const ancho = doc.page.width - M * 2;

    this.encabezado(doc, ancho, c, so, sucursal, razon);
    this.cliente(doc, ancho, c, so);
    this.unidad(doc, ancho, c, so, checklist);
    this.conceptos(
      doc,
      ancho,
      c,
      so,
      operaciones,
      refacciones,
      nombreParte,
      sucursal,
    );
    this.recepcion(doc, ancho, c, checklist, fotos, marcas, nombreSpec);
    this.cierre(doc, ancho, c, so);
    this.pieDePagina(doc);

    doc.end();
    return { buffer: await fin, filename: `${so.folio}.pdf` };
  }

  // ─── Bloques del documento ───────────────────────

  /** Título de sección: una banda con el nombre, para separar de un vistazo. */
  private seccion(doc: PDFKit.PDFDocument, ancho: number, c: ColoresMarca, texto: string): void {
    // Si no cabe el título más una línea, la sección empieza en otra hoja: un
    // encabezado solo al pie de página no orienta a nadie.
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc.rect(M, doc.y, ancho, 16).fill(c.marca);
    doc
      .fillColor('#FFFFFF')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text(texto.toUpperCase(), M + 6, doc.y + 4.5);
    doc.moveDown(0.9);
    doc.fillColor(c.tinta).font('Helvetica');
  }

  /** Pares etiqueta/valor en columnas. */
  private campos(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    pares: [string, string][],
    columnas = 3,
  ): void {
    const w = ancho / columnas;
    const alto = 26;
    let x = M;
    let y = doc.y;
    pares.forEach((par, i) => {
      if (i > 0 && i % columnas === 0) {
        x = M;
        y += alto;
      }
      doc.fontSize(6.5).fillColor(TENUE).text(par[0].toUpperCase(), x, y, {
        width: w - 8,
      });
      doc
        .fontSize(9)
        .fillColor(c.tinta)
        .text(par[1] || '—', x, y + 9, { width: w - 8, ellipsis: true });
      x += w;
    });
    doc.y = y + alto;
    doc.x = M;
  }

  private encabezado(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    so: ServiceOrder,
    sucursal: Branch | null,
    razon: LegalEntity | null,
  ): void {
    doc.fontSize(14).font('Helvetica-Bold').fillColor(c.marca);
    doc.text(razon?.name ?? sucursal?.name ?? 'Taller', M, M, {
      width: ancho * 0.6,
    });

    doc.fontSize(8).font('Helvetica').fillColor(TENUE);
    const señas = [
      sucursal?.name,
      sucursal?.address,
      [sucursal?.city, sucursal?.state].filter(Boolean).join(', '),
      sucursal?.counterPhone ? `Tel. ${sucursal.counterPhone}` : null,
      razon?.rfc ? `RFC ${razon.rfc}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    doc.text(señas, { width: ancho * 0.6 });

    // El folio va arriba a la derecha: es lo que se busca con el papel en la
    // mano, entre veinte órdenes sobre el mostrador.
    const dx = M + ancho * 0.62;
    doc.fontSize(9).fillColor(TENUE).text('ORDEN DE SERVICIO', dx, M, {
      width: ancho * 0.38,
      align: 'right',
    });
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(c.marca)
      .text(so.folio, dx, M + 12, { width: ancho * 0.38, align: 'right' });
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(TENUE)
      .text(ESTATUS[so.status] ?? so.status, dx, M + 34, {
        width: ancho * 0.38,
        align: 'right',
      });

    doc.y = M + 58;
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(LINEA).stroke();
    doc.moveDown(0.8);

    const asesor = so.user
      ? `${so.user.firstName ?? ''} ${so.user.lastName ?? ''}`.trim()
      : '';
    const tecnico = so.mechanic
      ? `${so.mechanic.firstName ?? ''} ${so.mechanic.lastName ?? ''}`.trim()
      : '';
    this.campos(
      doc,
      ancho,
      c,
      [
        ['Recepción', this.fecha(so.receivedAt ?? so.createdAt)],
        ['Entrega prometida', this.fecha(so.promisedAt)],
        ['Asesor', asesor],
        ['Técnico', tecnico],
        ['Kilometraje', so.kmIn ? `${so.kmIn.toLocaleString('es-MX')} km` : ''],
        ['Impresa', this.impresion()],
      ],
      3,
    );
  }

  private cliente(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    so: ServiceOrder,
  ): void {
    const dueno = so.owner;
    const nombre = dueno
      ? dueno.companyName ||
        `${dueno.firstName ?? ''} ${dueno.lastName ?? ''}`.trim()
      : so.receptionName || '';
    this.seccion(doc, ancho, c, 'Datos del cliente');
    this.campos(
      doc,
      ancho,
      c,
      [
        ['Nombre o razón social', nombre],
        ['RFC', dueno?.rfc ?? ''],
        ['Teléfono', dueno?.phone ?? so.receptionPhone ?? ''],
        ['Correo', dueno?.email ?? ''],
        ['Domicilio', dueno?.address ?? ''],
        ['Ciudad', [dueno?.city, dueno?.state].filter(Boolean).join(', ')],
      ],
      3,
    );
  }

  private unidad(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    so: ServiceOrder,
    checklist: ReceptionChecklist | null,
  ): void {
    const v = so.vehicle as unknown as Record<string, unknown> | undefined;
    this.seccion(doc, ancho, c, 'Datos de la unidad');
    this.campos(
      doc,
      ancho,
      c,
      [
        [
          'Unidad',
          [v?.['make'], v?.['model'], v?.['year']].filter(Boolean).join(' '),
        ],
        ['Placas', (v?.['plate'] as string) ?? ''],
        ['Color', (v?.['color'] as string) ?? ''],
        ['Número de serie', (v?.['vin'] as string) ?? ''],
        ['Motor', (v?.['engineNumber'] as string) ?? ''],
        [
          'Combustible',
          checklist ? `${checklist.fuelLevel}%` : '',
        ],
      ],
      3,
    );

    if (so.reportedFault) {
      doc.fontSize(6.5).fillColor(TENUE).text('FALLA REPORTADA POR EL CLIENTE');
      doc.fontSize(9).fillColor(c.tinta).text(so.reportedFault, { width: ancho });
      doc.moveDown(0.5);
    }
  }

  private conceptos(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    so: ServiceOrder,
    operaciones: ServiceOrderOperation[],
    refacciones: ServiceOrderPart[],
    nombreParte: Map<string, Part>,
    sucursal: Branch | null,
  ): void {
    this.seccion(doc, ancho, c, 'Conceptos y costos');

    // Columnas: descripción elástica, números a la derecha y alineados.
    const cImporte = 80;
    const cPU = 70;
    const cCant = 40;
    const cDesc = ancho - cImporte - cPU - cCant;

    const fila = (
      celdas: [string, string, string, string],
      opciones: { negrita?: boolean; tenue?: boolean } = {},
    ) => {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const y = doc.y;
      doc
        .font(opciones.negrita ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8)
        .fillColor(opciones.tenue ? TENUE : c.tinta);
      doc.text(celdas[0], M, y, { width: cDesc - 6 });
      const alto = doc.y - y;
      doc.text(celdas[1], M + cDesc, y, { width: cCant - 6, align: 'right' });
      doc.text(celdas[2], M + cDesc + cCant, y, {
        width: cPU - 6,
        align: 'right',
      });
      doc.text(celdas[3], M + cDesc + cCant + cPU, y, {
        width: cImporte - 6,
        align: 'right',
      });
      doc.y = y + Math.max(alto, 11);
    };

    fila(['Concepto', 'Cant.', 'P. unitario', 'Importe'], {
      negrita: true,
      tenue: true,
    });
    doc.moveTo(M, doc.y).lineTo(M + ancho, doc.y).strokeColor(LINEA).stroke();
    doc.moveDown(0.3);

    if (operaciones.length) {
      fila(['Mano de obra', '', '', ''], { negrita: true });
      for (const op of operaciones) {
        const precio = Number(op.laborPrice) || 0;
        fila([
          `   ${op.code ? op.code + ' · ' : ''}${op.description}`,
          '',
          '',
          this.dinero(precio),
        ]);
      }
    }

    if (refacciones.length) {
      fila(['Refacciones', '', '', ''], { negrita: true });
      for (const r of refacciones) {
        const p = nombreParte.get(r.partId);
        fila([
          `   ${p?.sku ? p.sku + ' · ' : ''}${p?.name ?? 'Refacción'}`,
          String(r.quantity),
          this.dinero(Number(r.unitPrice)),
          this.dinero(Number(r.subtotal)),
        ]);
      }
    }

    if (!operaciones.length && !refacciones.length) {
      fila(['Sin conceptos capturados todavía', '', '', ''], { tenue: true });
    }

    // ── Totales ──
    //
    // El subtotal se arma de sus partes y NO se toma de `service_orders.total`:
    // ese campo hoy significa dos cosas según quién lo escribió último —el
    // código lo recalcula sin impuesto al mover refacciones, y hay órdenes
    // guardadas con el IVA ya dentro—. Sumarle el IVA a un número que ya lo
    // trae cobraría el impuesto dos veces en un papel que el cliente firma.
    //
    // Haciendo la cuenta aquí, lo que se imprime siempre cuadra consigo mismo:
    // las tres cifras de arriba dan la de abajo.
    //
    // Y cuando hay renglones, mandan ellos: el acumulado de la orden se ha
    // visto desfasado de sus propias líneas, y en un papel que se firma lo
    // intolerable es que el detalle no sume lo que dice el resumen. Sin
    // renglones capturados se usa el acumulado, que entonces es lo único que
    // hay.
    const manoObra = operaciones.length
      ? operaciones.reduce((a, o) => a + (Number(o.laborPrice) || 0), 0)
      : Number(so.laborCost) || 0;
    const partes = refacciones.length
      ? refacciones.reduce((a, r) => a + (Number(r.subtotal) || 0), 0)
      : Number(so.partsCost) || 0;
    const descuento = Number(so.discount) || 0;
    const subtotal = manoObra + partes - descuento;
    const tasa = Number(sucursal?.taxRate ?? 0.16);
    const iva = subtotal * tasa;

    doc.moveDown(0.4);
    doc
      .moveTo(M + ancho * 0.5, doc.y)
      .lineTo(M + ancho, doc.y)
      .strokeColor(LINEA)
      .stroke();
    doc.moveDown(0.4);

    const totalLinea = (etiqueta: string, valor: string, fuerte = false) => {
      const y = doc.y;
      doc
        .font(fuerte ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fuerte ? 11 : 9)
        .fillColor(fuerte ? c.marca : TENUE);
      doc.text(etiqueta, M + ancho * 0.5, y, {
        width: ancho * 0.28,
        align: 'right',
      });
      doc.fillColor(fuerte ? c.marca : c.tinta);
      doc.text(valor, M + ancho * 0.78, y, {
        width: ancho * 0.22,
        align: 'right',
      });
      doc.y = y + (fuerte ? 16 : 13);
    };

    totalLinea('Mano de obra', this.dinero(manoObra));
    totalLinea('Refacciones', this.dinero(partes));
    if (descuento) totalLinea('Descuento', `- ${this.dinero(descuento)}`);
    totalLinea('Subtotal', this.dinero(subtotal));
    totalLinea(`IVA ${(tasa * 100).toFixed(0)}%`, this.dinero(iva));
    totalLinea('TOTAL', this.dinero(subtotal + iva), true);

    doc
      .fontSize(7)
      .fillColor(TENUE)
      .text(
        'Precios en moneda nacional. El importe es un presupuesto: cualquier trabajo adicional se autoriza por separado antes de ejecutarse.',
        M,
        doc.y + 2,
        { width: ancho },
      );
    doc.moveDown(0.6);
  }

  private recepcion(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    checklist: ReceptionChecklist | null,
    fotos: ReceptionPhoto[],
    marcas: ReceptionPhotoMark[],
    nombreSpec: Map<string, string>,
  ): void {
    if (!checklist) return;
    this.seccion(doc, ancho, c, 'Cómo se recibió la unidad');

    const inventario: [string, boolean][] = [
      ['Herramienta', checklist.hasTools],
      ['Documentos', checklist.hasDocuments],
      ['Llanta de refacción', checklist.hasSpareTire],
      ['Tapetes', checklist.hasMats],
    ];
    const w = ancho / 4;
    const y = doc.y;
    inventario.forEach(([nombre, hay], i) => {
      // Casilla dibujada y marcada: una lista de los que sí traía dejaría en
      // duda si los demás faltaban o si nadie los revisó.
      const x = M + w * i;
      doc.rect(x, y + 1, 8, 8).lineWidth(0.7).strokeColor(TENUE).stroke();
      if (hay) {
        doc
          .moveTo(x + 1.7, y + 5)
          .lineTo(x + 3.4, y + 7)
          .lineTo(x + 6.5, y + 2.5)
          .lineWidth(1.2)
          .strokeColor(c.marca)
          .stroke();
      }
      doc.fontSize(8).fillColor(c.tinta).text(nombre, x + 12, y, {
        width: w - 16,
      });
    });
    doc.y = y + 16;
    doc.x = M;

    if (checklist.observations) {
      doc.fontSize(6.5).fillColor(TENUE).text('OBSERVACIONES');
      doc
        .fontSize(8.5)
        .fillColor(c.tinta)
        .text(checklist.observations, { width: ancho });
      doc.moveDown(0.3);
    }
    if (checklist.damageDescription) {
      doc.fontSize(6.5).fillColor(TENUE).text('DAÑOS VISIBLES');
      doc
        .fontSize(8.5)
        .fillColor(c.tinta)
        .text(checklist.damageDescription, { width: ancho });
      doc.moveDown(0.3);
    }

    // Los daños marcados sobre las fotos, numerados como en la pantalla: es lo
    // que se compara a la entrega cuando el cliente dice que ese golpe no venía.
    if (marcas.length) {
      doc.moveDown(0.2);
      doc
        .fontSize(6.5)
        .fillColor(TENUE)
        .text(`DAÑOS MARCADOS EN LA EVIDENCIA (${marcas.length})`);
      doc.moveDown(0.2);
      for (const foto of fotos) {
        const suyas = marcas.filter((m) => m.receptionPhotoId === foto.id);
        if (!suyas.length) continue;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(c.tinta)
          .text(nombreSpec.get(foto.specCode ?? '') ?? foto.specCode ?? 'Foto', {
            width: ancho,
          });
        doc.font('Helvetica');
        suyas.forEach((m, i) => {
          if (doc.y > doc.page.height - 70) doc.addPage();
          doc
            .fontSize(8)
            .fillColor(c.tinta)
            .text(
              `${i + 1}. ${DANOS[m.markType] ?? m.markType}` +
                `${m.shape === 'CIRCLE' ? ' (área)' : ''}` +
                `${m.note ? ` — ${m.note}` : ''}`,
              M + 10,
              doc.y,
              { width: ancho - 10 },
            );
        });
        doc.moveDown(0.2);
      }
      doc.x = M;
    }
    doc.moveDown(0.4);
  }

  private cierre(
    doc: PDFKit.PDFDocument,
    ancho: number,
    c: ColoresMarca,
    so: ServiceOrder,
  ): void {
    if (doc.y > doc.page.height - 170) doc.addPage();
    this.seccion(doc, ancho, c, 'Autorización del cliente');

    doc
      .fontSize(7.5)
      .fillColor(c.tinta)
      .text(
        'Autorizo la ejecución de los trabajos descritos y su costo. Reconozco que el taller ' +
          'no se hace responsable por objetos de valor que se queden en el interior de la unidad ' +
          'y que no hayan sido reportados al recibirla. Cualquier trabajo adicional que resulte ' +
          'del diagnóstico será presupuestado y requerirá mi autorización antes de ejecutarse.',
        M,
        doc.y,
        // Sin justificar: pdfkit coloca palabra por palabra para cuadrar el
        // margen y el texto deja de poder copiarse del PDF. En un párrafo que
        // alguien puede necesitar pegar en un correo, eso pesa más que la
        // línea recta del margen derecho.
        { width: ancho },
      );
    doc.moveDown(0.6);

    doc.fontSize(7.5).fillColor(TENUE);
    doc.text('Deseo recibir las refacciones sustituidas:   SÍ [   ]    NO [   ]', {
      width: ancho,
    });
    doc.text(
      'No se entregan las que se cambien en garantía ni las consideradas residuo peligroso.',
      { width: ancho },
    );
    doc.moveDown(1.8);

    // Dos firmas al pie, con espacio real para firmar encima de la raya.
    const wFirma = (ancho - 40) / 2;
    const y = doc.y;
    [
      ['Firma del cliente', so.owner?.companyName ||
        `${so.owner?.firstName ?? ''} ${so.owner?.lastName ?? ''}`.trim()],
      ['Firma del asesor', so.user
        ? `${so.user.firstName ?? ''} ${so.user.lastName ?? ''}`.trim()
        : ''],
    ].forEach(([rotulo, nombre], i) => {
      const x = M + (wFirma + 40) * i;
      doc.moveTo(x, y).lineTo(x + wFirma, y).strokeColor(TENUE).lineWidth(0.7).stroke();
      doc.fontSize(7).fillColor(TENUE).text(rotulo, x, y + 4, { width: wFirma });
      if (nombre) {
        doc.fontSize(8).fillColor(c.tinta).text(nombre, x, y + 13, {
          width: wFirma,
          ellipsis: true,
        });
      }
    });
    doc.y = y + 30;
  }

  /** Numeración al pie: una orden de dos hojas se separa con facilidad. */
  private pieDePagina(doc: PDFKit.PDFDocument): void {
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      doc
        .fontSize(7)
        .fillColor(TENUE)
        .text(
          `Página ${i + 1} de ${paginas.count}`,
          M,
          doc.page.height - 28,
          { width: doc.page.width - M * 2, align: 'center' },
        );
    }
  }
}
