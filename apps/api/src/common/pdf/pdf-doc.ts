import PDFDocument from 'pdfkit';
import { paletaPorId } from '../../modules/tenants/branding.paletas';

/**
 * Constructor común de documentos PDF (impresiones del negocio).
 *
 * Homologa la identidad de todos los papeles del sistema —orden de servicio,
 * corte de caja, cotización, recibos…— en un solo sitio: encabezado con el
 * logotipo y los colores del tenant, bandas de sección, rejilla de campos,
 * líneas de totales, firmas y pie con numeración. Cada servicio aporta solo su
 * contenido; el "cómo se ve" vive aquí.
 *
 * Los colores viajan en la instancia (no como constantes globales) porque dos
 * documentos de clientes distintos pueden generarse a la vez y una constante
 * reasignada teñiría uno con la marca del otro.
 */

export const PDF_TENUE = '#5A6B78';
export const PDF_LINEA = '#DDE3E9';

/**
 * Descarga el primer logotipo disponible, en orden de prioridad. Las impresiones
 * varían por sucursal: primero el logo de la sucursal, luego el del tenant, y si
 * no hay ninguno, el encabezado cae al nombre/razón social. Best-effort: si una
 * llave no baja, se prueba la siguiente.
 */
export async function descargarLogo(
  storage: { download(key: string): Promise<Buffer> },
  ...keys: (string | null | undefined)[]
): Promise<Buffer | null> {
  for (const k of keys) {
    if (!k) continue;
    try {
      return await storage.download(k);
    } catch {
      // sigue con la siguiente
    }
  }
  return null;
}

export interface EncabezadoPdf {
  /** Rótulo del tipo de documento, arriba a la derecha. Ej. "ORDEN DE SERVICIO". */
  titulo: string;
  /** Folio legible del documento (no el GUID). */
  folio?: string;
  /** Estado, bajo el folio. Ej. "Recibida", "Vigente". */
  estatus?: string;
  /** Nombre grande de la izquierda: razón social o nombre del negocio. */
  entidad?: string;
  /** Señas bajo el nombre: dirección, teléfono, RFC… ya unidas con ' · '. */
  senas?: string;
  /** Logotipo del tenant (PNG/JPEG). Si falta, se usa el nombre en grande. */
  logo?: Buffer | null;
  /** Pares etiqueta/valor bajo el divisor (fecha, asesor, etc.). */
  meta?: [string, string][];
}

export class PdfDoc {
  readonly doc: PDFKit.PDFDocument;
  readonly M: number;
  readonly ancho: number;
  readonly tinta: string;
  readonly marca: string;
  private readonly trozos: Buffer[] = [];
  private readonly fin: Promise<Buffer>;

  constructor(opts: {
    size?: PDFKit.PDFDocumentOptions['size'];
    margin?: number;
    paletteId?: string | null;
  } = {}) {
    this.M = opts.margin ?? 40;
    const p = paletaPorId(opts.paletteId ?? null);
    this.tinta = p.tinta;
    this.marca = p.primary;
    this.doc = new PDFDocument({
      size: opts.size ?? 'LETTER',
      margin: this.M,
      bufferPages: true,
    });
    this.ancho = this.doc.page.width - this.M * 2;
    this.doc.on('data', (c: Buffer) => this.trozos.push(c));
    this.fin = new Promise<Buffer>((r) =>
      this.doc.on('end', () => r(Buffer.concat(this.trozos))),
    );
  }

  // ─── Formato ───────────────────────────────────────

  dinero(n: number | string | null | undefined): string {
    return (Number(n) || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  /**
   * Fecha guardada en la base: se imprime SIN convertir de huso. La base guarda
   * hora local del negocio y el contenedor corre en UTC; convertir le restaría
   * horas y una recepción de las 9:00 saldría a las 3:00.
   */
  fecha(d: Date | string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Solo la parte de fecha (sin hora), misma regla de huso que `fecha`. */
  soloFecha(d: Date | string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * El instante de imprimir, que sí es absoluto: `new Date()` en un contenedor
   * UTC necesita declarar el huso o el papel sale sellado seis horas adelante.
   */
  impresion(): string {
    return new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Bloques comunes ───────────────────────────────

  /** Encabezado de marca: logo + entidad a la izquierda, título/folio a la derecha. */
  encabezado(e: EncabezadoPdf): void {
    const { doc, M, ancho } = this;
    const colIzq = ancho * 0.6;
    let yIzq = M;

    if (e.logo) {
      try {
        doc.image(e.logo, M, M, { fit: [150, 46] });
        yIzq = M + 52;
      } catch {
        // Formato no soportado por pdfkit: cae al nombre en grande.
      }
    }
    if (!e.logo || yIzq === M) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(this.marca);
      doc.text(e.entidad ?? 'Negocio', M, M, { width: colIzq });
      yIzq = doc.y + 2;
    } else if (e.entidad) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(this.tinta);
      doc.text(e.entidad, M, yIzq, { width: colIzq });
      yIzq = doc.y;
    }

    if (e.senas) {
      doc.fontSize(8).font('Helvetica').fillColor(PDF_TENUE);
      doc.text(e.senas, M, yIzq, { width: colIzq });
      yIzq = doc.y; // tras las señas, para que el divisor no las pise
    }

    // Bloque derecho: tipo de documento + folio + estatus.
    const dx = M + ancho * 0.62;
    const wDer = ancho * 0.38;
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(PDF_TENUE)
      .text(e.titulo.toUpperCase(), dx, M, { width: wDer, align: 'right' });
    if (e.folio) {
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(this.marca)
        .text(e.folio, dx, M + 12, { width: wDer, align: 'right' });
    }
    if (e.estatus) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(PDF_TENUE)
        .text(e.estatus, dx, M + 34, { width: wDer, align: 'right' });
    }

    doc.y = Math.max(yIzq, M + 58);
    doc
      .moveTo(M, doc.y)
      .lineTo(M + ancho, doc.y)
      .strokeColor(PDF_LINEA)
      .stroke();
    doc.moveDown(0.8);

    if (e.meta?.length) this.campos(e.meta, 3);
  }

  /** Banda de sección: separa bloques de un vistazo. */
  seccion(texto: string): void {
    const { doc, M, ancho } = this;
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc.rect(M, doc.y, ancho, 16).fill(this.marca);
    doc
      .fillColor('#FFFFFF')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text(texto.toUpperCase(), M + 6, doc.y + 4.5);
    doc.moveDown(0.9);
    doc.fillColor(this.tinta).font('Helvetica');
  }

  /** Rejilla de pares etiqueta/valor en columnas. */
  campos(pares: [string, string][], columnas = 3): void {
    const { doc, M, ancho } = this;
    const w = ancho / columnas;
    const alto = 26;
    let x = M;
    let y = doc.y;
    pares.forEach((par, i) => {
      if (i > 0 && i % columnas === 0) {
        x = M;
        y += alto;
      }
      doc.fontSize(6.5).fillColor(PDF_TENUE).text(par[0].toUpperCase(), x, y, {
        width: w - 8,
      });
      doc
        .fontSize(9)
        .fillColor(this.tinta)
        .text(par[1] || '—', x, y + 9, { width: w - 8, ellipsis: true });
      x += w;
    });
    doc.y = y + alto;
    doc.x = M;
  }

  /** Línea de total etiqueta→valor, alineada a la derecha. */
  lineaTotal(etiqueta: string, valor: string, fuerte = false): void {
    const { doc, M, ancho } = this;
    const y = doc.y;
    doc
      .font(fuerte ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fuerte ? 11 : 9)
      .fillColor(fuerte ? this.marca : PDF_TENUE);
    doc.text(etiqueta, M + ancho * 0.5, y, { width: ancho * 0.28, align: 'right' });
    doc.fillColor(fuerte ? this.marca : this.tinta);
    doc.text(valor, M + ancho * 0.78, y, { width: ancho * 0.22, align: 'right' });
    doc.y = y + (fuerte ? 16 : 13);
  }

  /** Divisor tenue de media anchura (antes de los totales). */
  divisorTotales(): void {
    const { doc, M, ancho } = this;
    doc.moveDown(0.4);
    doc
      .moveTo(M + ancho * 0.5, doc.y)
      .lineTo(M + ancho, doc.y)
      .strokeColor(PDF_LINEA)
      .stroke();
    doc.moveDown(0.4);
  }

  /** Líneas de firma al pie, con espacio real encima de la raya. */
  firmas(pares: [string, string][]): void {
    const { doc, M, ancho } = this;
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc.moveDown(1.4);
    const hueco = 40;
    const w = (ancho - hueco * (pares.length - 1)) / pares.length;
    const y = doc.y;
    pares.forEach(([rotulo, nombre], i) => {
      const x = M + (w + hueco) * i;
      doc
        .moveTo(x, y)
        .lineTo(x + w, y)
        .strokeColor(PDF_TENUE)
        .lineWidth(0.7)
        .stroke();
      doc.fontSize(7).fillColor(PDF_TENUE).text(rotulo, x, y + 4, { width: w });
      if (nombre) {
        doc
          .fontSize(8)
          .fillColor(this.tinta)
          .text(nombre, x, y + 13, { width: w, ellipsis: true });
      }
    });
    doc.y = y + 30;
    doc.x = M;
  }

  /** Nota fina de pie de documento (condiciones/leyenda). */
  nota(texto: string): void {
    const { doc, M, ancho } = this;
    doc.fontSize(7).fillColor(PDF_TENUE).text(texto, M, doc.y + 2, { width: ancho });
    doc.moveDown(0.5);
  }

  /** Numeración al pie de todas las páginas. */
  pieDePagina(leyenda?: string): void {
    const { doc, M } = this;
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      // El pie va bajo el margen inferior: sin anularlo, pdfkit trata esa `y`
      // como desborde y crea una hoja extra solo con el pie.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const texto = leyenda
        ? `${leyenda}  ·  Página ${i + 1} de ${paginas.count}`
        : `Página ${i + 1} de ${paginas.count}`;
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(PDF_TENUE)
        .text(texto, M, doc.page.height - 24, {
          width: doc.page.width - M * 2,
          align: 'center',
        });
      doc.page.margins.bottom = bottom;
    }
  }

  /**
   * Renderiza un subconjunto de HTML (el que produce el editor del cliente):
   * párrafos, títulos h1–h3, listas ul/ol, y negritas/cursivas/subrayado en
   * línea. No es un motor HTML completo (para eso sería HTML→PDF); cubre lo
   * típico de un contrato. Todo con el ancho y colores del documento.
   */
  html(raw: string): void {
    const tokens = this.tokenizarHtml(raw || '');
    let bold = false;
    let italic = false;
    let underline = false;
    const lista: ('ul' | 'ol')[] = [];
    const contador: number[] = [];
    let runs: { t: string; b: boolean; i: boolean; u: boolean }[] = [];
    let bloque: 'p' | 'h1' | 'h2' | 'h3' | 'li' | null = null;
    let vinieta = '';

    const flush = () => {
      if (bloque && runs.some((r) => r.t.trim())) {
        this.renderBloque(bloque, runs, lista.length, vinieta);
      }
      runs = [];
      vinieta = '';
    };

    for (const tk of tokens) {
      if (tk.tag) {
        const n = tk.name;
        if (n === 'b' || n === 'strong') bold = tk.open;
        else if (n === 'i' || n === 'em') italic = tk.open;
        else if (n === 'u') underline = tk.open;
        else if (n === 'br') runs.push({ t: '\n', b: bold, i: italic, u: underline });
        else if (['p', 'h1', 'h2', 'h3', 'div', 'blockquote'].includes(n)) {
          flush();
          bloque = tk.open
            ? ((n === 'div' || n === 'blockquote' ? 'p' : n) as typeof bloque)
            : null;
        } else if (n === 'ul' || n === 'ol') {
          if (tk.open) {
            lista.push(n);
            contador.push(0);
          } else {
            lista.pop();
            contador.pop();
          }
        } else if (n === 'li') {
          if (tk.open) {
            flush();
            bloque = 'li';
            const tipo = lista[lista.length - 1] ?? 'ul';
            if (tipo === 'ol') {
              contador[contador.length - 1]++;
              vinieta = `${contador[contador.length - 1]}. `;
            } else {
              vinieta = '•  ';
            }
          } else {
            flush();
            bloque = null;
          }
        }
      } else {
        const texto = this.decodeHtml(tk.text).replace(/\s+/g, ' ');
        if (!texto.trim() && !runs.length) continue;
        if (!bloque) bloque = 'p';
        runs.push({ t: texto, b: bold, i: italic, u: underline });
      }
    }
    flush();
  }

  private tokenizarHtml(
    raw: string,
  ): ({ tag: false; text: string } | { tag: true; name: string; open: boolean })[] {
    const limpio = raw
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    const out: (
      | { tag: false; text: string }
      | { tag: true; name: string; open: boolean }
    )[] = [];
    const re = /<\s*(\/?)\s*([a-zA-Z0-9]+)[^>]*?>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(limpio)) !== null) {
      if (m.index > last) out.push({ tag: false, text: limpio.slice(last, m.index) });
      out.push({ tag: true, name: m[2].toLowerCase(), open: m[1] !== '/' });
      last = re.lastIndex;
    }
    if (last < limpio.length) out.push({ tag: false, text: limpio.slice(last) });
    return out;
  }

  private decodeHtml(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  private renderBloque(
    tipo: 'p' | 'h1' | 'h2' | 'h3' | 'li',
    runs: { t: string; b: boolean; i: boolean; u: boolean }[],
    nivelLista: number,
    vinieta: string,
  ): void {
    const { doc, M, ancho } = this;
    if (doc.y > doc.page.height - 60) doc.addPage();
    const size = tipo === 'h1' ? 14 : tipo === 'h2' ? 12 : tipo === 'h3' ? 10.5 : 9;
    const negritaBloque = tipo.startsWith('h');
    const indent = tipo === 'li' ? 14 + (nivelLista - 1) * 12 : 0;
    const x = M + indent;
    const w = ancho - indent;
    const y0 = doc.y;

    if (vinieta) {
      doc
        .font('Helvetica')
        .fontSize(size)
        .fillColor(this.tinta)
        .text(vinieta, x - 12, y0, { width: 12, lineBreak: false });
      doc.y = y0;
    }

    runs.forEach((r, idx) => {
      const b = r.b || negritaBloque;
      const font =
        b && r.i
          ? 'Helvetica-BoldOblique'
          : b
            ? 'Helvetica-Bold'
            : r.i
              ? 'Helvetica-Oblique'
              : 'Helvetica';
      doc
        .font(font)
        .fontSize(size)
        .fillColor(negritaBloque ? this.marca : this.tinta)
        .text(r.t === '\n' ? ' ' : r.t, idx === 0 ? x : undefined, idx === 0 ? y0 : undefined, {
          width: w,
          continued: idx < runs.length - 1,
          underline: r.u,
        });
    });
    doc.moveDown(tipo.startsWith('h') ? 0.4 : 0.35);
    doc.x = M;
  }

  /**
   * Marca de agua diagonal en todas las páginas (p. ej. "Solo para fines
   * ilustrativos"). Se estampa tenue y girada, sobre el contenido, para dejar
   * claro que el documento es una plantilla/borrador y no el definitivo.
   */
  marcaDeAgua(texto: string): void {
    const { doc } = this;
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      const w = doc.page.width;
      const h = doc.page.height;
      doc.save();
      doc.rotate(-45, { origin: [w / 2, h / 2] });
      doc
        .fontSize(46)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .opacity(0.07)
        .text(texto.toUpperCase(), w / 2 - h / 2, h / 2 - 28, {
          width: h,
          align: 'center',
        });
      doc.opacity(1);
      doc.restore();
    }
  }

  /** Cierra el documento y entrega el buffer. */
  async finalizar(): Promise<Buffer> {
    this.doc.end();
    return this.fin;
  }
}
