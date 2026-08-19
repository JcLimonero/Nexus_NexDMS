import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import { Fila, getImportDef, IMPORTABLES } from './import-defs';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

const HOJA = 'Plantilla';

@Injectable()
export class ImportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Catálogos que se pueden importar, con sus columnas (para la UI). */
  listar() {
    return IMPORTABLES.map((d) => ({
      key: d.key,
      label: d.label,
      columnas: d.columnas.map((c) => ({
        header: c.header,
        required: !!c.required,
        opciones: c.opciones,
        nota: c.nota,
      })),
    }));
  }

  /** Genera la plantilla .xlsx (encabezados + hoja de instrucciones). */
  async plantilla(
    key: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const def = getImportDef(key);
    if (!def) throw new BadRequestException(`Catálogo desconocido: ${key}`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(HOJA);

    // Encabezados en la primera fila.
    ws.columns = def.columnas.map((c) => ({
      header: c.header + (c.required ? ' *' : ''),
      key: c.key,
      width: Math.max(14, c.header.length + 4),
    }));
    const cab = ws.getRow(1);
    cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cab.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF105078' },
    };
    cab.alignment = { vertical: 'middle' };
    cab.height = 22;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Hoja de instrucciones: qué es cada columna, con un ejemplo.
    const ins = wb.addWorksheet('Instrucciones');
    ins.columns = [
      { header: 'Columna', key: 'h', width: 24 },
      { header: '¿Obligatoria?', key: 'r', width: 14 },
      { header: 'Ejemplo', key: 'e', width: 22 },
      { header: 'Valores / notas', key: 'n', width: 60 },
    ];
    ins.getRow(1).font = { bold: true };
    for (const c of def.columnas) {
      const notas = [c.nota, c.opciones ? `Valores: ${c.opciones.join(', ')}` : '']
        .filter(Boolean)
        .join(' · ');
      ins.addRow({
        h: c.header,
        r: c.required ? 'Sí' : 'No',
        e: c.ejemplo ?? '',
        n: notas,
      });
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, filename: `plantilla-${key}.xlsx` };
  }

  /** Procesa el .xlsx cargado y crea los registros. */
  async importar(
    key: string,
    file: Express.Multer.File,
    user: UserPayload,
  ): Promise<{
    total: number;
    insertados: number;
    errores: { fila: number; mensaje: string }[];
  }> {
    const def = getImportDef(key);
    if (!def) throw new BadRequestException(`Catálogo desconocido: ${key}`);
    if (!file?.buffer) throw new BadRequestException('Archivo requerido');

    const wb = new ExcelJS.Workbook();
    try {
      // Cast por el desajuste de tipos Buffer<ArrayBufferLike> de @types/node;
      // en runtime exceljs acepta el Buffer de Multer sin problema.
      await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException('El archivo no es un Excel válido (.xlsx)');
    }
    const ws = wb.getWorksheet(HOJA) ?? wb.worksheets[0];
    if (!ws) throw new BadRequestException('El Excel no tiene hojas');

    // Mapa encabezado→índice de columna, tolerante a mayúsculas y al asterisco.
    const encabezados = ws.getRow(1);
    const porHeader = new Map<string, number>();
    encabezados.eachCell((cell, col) => {
      const txt = String(cell.text ?? '')
        .replace(/\*/g, '')
        .trim()
        .toLowerCase();
      if (txt) porHeader.set(txt, col);
    });
    const colDe = (header: string) =>
      porHeader.get(header.trim().toLowerCase());

    // Se arman las filas por clave interna.
    const filas: Fila[] = [];
    ws.eachRow((row, num) => {
      if (num === 1) return; // encabezados
      const datos: Record<string, string> = {};
      let algo = false;
      for (const c of def.columnas) {
        const idx = colDe(c.header);
        const valor = idx ? String(row.getCell(idx).text ?? '').trim() : '';
        datos[c.key] = valor;
        if (valor) algo = true;
      }
      if (algo) filas.push({ __fila: num, ...datos } as Fila);
    });

    if (filas.length === 0) {
      throw new BadRequestException('El Excel no tiene filas con datos');
    }

    // Todo en una transacción: o cargan las válidas juntas, o nada si truena.
    const res = await this.dataSource.transaction((em) =>
      def.importar(filas, {
        em,
        tenantId: user.tenantId,
        userId: user.sub,
      }),
    );

    return {
      total: filas.length,
      insertados: res.insertados,
      errores: res.errores,
    };
  }
}
