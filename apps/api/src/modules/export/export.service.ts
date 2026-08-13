import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

interface Columna {
  header: string;
  key: string;
  width?: number;
}

interface Dataset {
  titulo: string;
  columnas: Columna[];
  /** $1 es siempre el tenant. Los filtros opcionales van después. */
  sql: string;
}

/**
 * Listados exportables.
 *
 * Van declarados aquí, con SQL fijo y el tenant como primer parámetro, en vez
 * de dejar que el cliente componga la consulta: es un export, no un motor de
 * reportes, y no debe poder pedir datos de otro tenant.
 */
const DATASETS: Record<string, Dataset> = {
  'ordenes-servicio': {
    titulo: 'Órdenes de servicio',
    columnas: [
      { header: 'Folio', key: 'folio', width: 16 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Unidad', key: 'unidad', width: 26 },
      { header: 'Placa', key: 'placa', width: 12 },
      { header: 'Estatus', key: 'estatus', width: 18 },
      { header: 'Técnico', key: 'tecnico', width: 24 },
    ],
    sql: `
      SELECT so.folio,
             to_char(so.created_at, 'DD/MM/YYYY') AS fecha,
             coalesce(c.company_name, trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,''))) AS cliente,
             trim(coalesce(v.make,'') || ' ' || coalesce(v.model,'')) AS unidad,
             v.plate AS placa,
             so.status AS estatus,
             trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) AS tecnico
        FROM service_orders so
        LEFT JOIN clients c ON c.id = so.owner_id
        LEFT JOIN customer_vehicles v ON v.id = so.vehicle_id
        LEFT JOIN users u ON u.id = so.mechanic_id
       WHERE so.tenant_id = $1
       ORDER BY so.created_at DESC
       LIMIT 5000`,
  },
  citas: {
    titulo: 'Citas de taller',
    columnas: [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 16 },
      { header: 'Unidad', key: 'unidad', width: 26 },
      { header: 'Servicio', key: 'servicio', width: 26 },
      { header: 'Estatus', key: 'estatus', width: 16 },
    ],
    sql: `
      SELECT to_char(a.scheduled_at, 'DD/MM/YYYY HH24:MI') AS fecha,
             coalesce(a.client_name, trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,''))) AS cliente,
             coalesce(a.client_phone, c.phone) AS telefono,
             trim(coalesce(v.make,'') || ' ' || coalesce(v.model,'')) AS unidad,
             a.service_type AS servicio,
             a.status AS estatus
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        LEFT JOIN customer_vehicles v ON v.id = a.vehicle_id
       WHERE a.tenant_id = $1
       ORDER BY a.scheduled_at DESC
       LIMIT 5000`,
  },
  clientes: {
    titulo: 'Clientes',
    columnas: [
      { header: 'Nombre', key: 'nombre', width: 34 },
      { header: 'RFC', key: 'rfc', width: 16 },
      { header: 'Teléfono', key: 'telefono', width: 16 },
      { header: 'Correo', key: 'correo', width: 28 },
      { header: 'Tipo', key: 'tipo', width: 14 },
    ],
    sql: `
      SELECT coalesce(c.company_name, trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,''))) AS nombre,
             c.rfc, c.phone AS telefono, c.email AS correo, c.type AS tipo
        FROM clients c
       WHERE c.tenant_id = $1
       ORDER BY nombre
       LIMIT 5000`,
  },
  refacciones: {
    titulo: 'Refacciones',
    columnas: [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Descripción', key: 'nombre', width: 40 },
      { header: 'Existencia', key: 'existencia', width: 12 },
      { header: 'Mínimo', key: 'minimo', width: 10 },
      { header: 'Costo', key: 'costo', width: 12 },
      { header: 'Público', key: 'publico', width: 12 },
    ],
    sql: `
      SELECT p.sku, p.name AS nombre, p.stock_quantity AS existencia,
             p.min_stock AS minimo, p.purchase_price AS costo, p.public_price AS publico
        FROM parts p
       WHERE p.tenant_id = $1
       ORDER BY p.name
       LIMIT 5000`,
  },
  productividad: {
    titulo: 'Productividad por técnico',
    columnas: [
      { header: 'Técnico', key: 'tecnico', width: 30 },
      { header: 'Operaciones', key: 'operaciones', width: 14 },
      { header: 'Minutos reales', key: 'reales', width: 16 },
      { header: 'Minutos baremo', key: 'baremo', width: 16 },
      { header: 'Eficiencia %', key: 'eficiencia', width: 14 },
    ],
    sql: `
      SELECT trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) AS tecnico,
             count(DISTINCT t.operation_id) AS operaciones,
             coalesce(sum(t.minutes), 0) AS reales,
             coalesce(sum(DISTINCT o.standard_minutes), 0) AS baremo,
             CASE WHEN coalesce(sum(t.minutes),0) > 0
                  THEN round(coalesce(sum(DISTINCT o.standard_minutes),0)::numeric * 100 / sum(t.minutes), 0)
                  ELSE NULL END AS eficiencia
        FROM service_order_times t
        JOIN service_orders so ON so.id = t.service_order_id
        LEFT JOIN service_order_operations o ON o.id = t.operation_id
        LEFT JOIN users u ON u.id = t.mechanic_id
       WHERE so.tenant_id = $1 AND t.ended_at IS NOT NULL
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY reales DESC`,
  },
};

@Injectable()
export class ExportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  listar() {
    return Object.entries(DATASETS).map(([clave, d]) => ({
      clave,
      titulo: d.titulo,
    }));
  }

  private definicion(dataset: string): Dataset {
    const d = DATASETS[dataset];
    if (!d) throw new BadRequestException(`Listado "${dataset}" no disponible`);
    return d;
  }

  private async filas(
    dataset: string,
    tenantId: string,
  ): Promise<Record<string, unknown>[]> {
    const d = this.definicion(dataset);
    return this.dataSource.query<Record<string, unknown>[]>(d.sql, [tenantId]);
  }

  async aExcel(
    dataset: string,
    tenantId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const d = this.definicion(dataset);
    const filas = await this.filas(dataset, tenantId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'NexDMS';
    wb.created = new Date();
    const ws = wb.addWorksheet(d.titulo.slice(0, 31));
    ws.columns = d.columnas.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 18,
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF203848' },
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    for (const f of filas) ws.addRow(f);
    // Con muchas filas, la cabecera fija es la diferencia entre usable o no.
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: d.columnas.length },
    };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, filename: `${dataset}-${this.hoy()}.xlsx` };
  }

  async aPdf(
    dataset: string,
    tenantId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const d = this.definicion(dataset);
    const filas = await this.filas(dataset, tenantId);

    // Apaisado: estos listados son anchos y en vertical se cortan.
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const fin = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const anchoUtil = doc.page.width - 72;
    const total = d.columnas.reduce((a, c) => a + (c.width ?? 18), 0);
    const anchos = d.columnas.map((c) => ((c.width ?? 18) / total) * anchoUtil);

    doc.fontSize(16).fillColor('#203848').text(d.titulo, { align: 'left' });
    doc
      .fontSize(8)
      .fillColor('#5A6B78')
      .text(
        `NexDMS · generado el ${new Date().toLocaleString('es-MX')} · ${filas.length} registros`,
      );
    doc.moveDown(0.8);

    const cabecera = (y: number) => {
      doc.fontSize(8).fillColor('#FFFFFF');
      doc.rect(36, y - 3, anchoUtil, 16).fill('#203848');
      let x = 36;
      doc.fillColor('#FFFFFF');
      d.columnas.forEach((c, i) => {
        doc.text(c.header, x + 3, y, { width: anchos[i] - 6, ellipsis: true });
        x += anchos[i];
      });
      return y + 18;
    };

    let y = cabecera(doc.y);
    doc.fontSize(8);
    for (const f of filas) {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = cabecera(50);
      }
      let x = 36;
      doc.fillColor('#1F2933');
      d.columnas.forEach((c, i) => {
        const v = f[c.key];
        doc.text(v === null || v === undefined ? '' : String(v), x + 3, y, {
          width: anchos[i] - 6,
          ellipsis: true,
        });
        x += anchos[i];
      });
      y += 14;
    }

    doc.end();
    return { buffer: await fin, filename: `${dataset}-${this.hoy()}.pdf` };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
