/**
 * Códigos legibles de documentos por empresa.
 *
 * Estructura: [PREFIJO_EMPRESA 3][CÓDIGO_OBJETO 1-3][CONSECUTIVO 8].
 * Ejemplos: cliente `APGC00000001`, orden de servicio `APGOS00000001`.
 *
 * El GUID sigue siendo la identidad real (relaciones/llaves foráneas); este
 * código es solo para que la gente lea y busque documentos, y se guarda ya
 * formado porque el prefijo de la empresa es inmutable una vez creada.
 */

/**
 * Códigos de objeto (1-3 letras) por tipo de documento de proceso. Son
 * permanentes: forman parte del código impreso/buscado de cada documento.
 */
export const CODIGO_OBJETO = {
  CLIENTE: 'C',
  // Servicio
  ORDEN_SERVICIO: 'OS',
  COTIZACION: 'COT',
  CITA_SERVICIO: 'CT',
  ORDEN_HOJALATERIA: 'HP',
  GARANTIA: 'GA',
  // Refacciones
  VENTA_MOSTRADOR: 'VM',
  PEDIDO_PROVEEDOR: 'OC',
  REQUISICION: 'RQ',
  TRASPASO: 'TR',
  DEVOLUCION_REFACCION: 'DV',
  CONTEO_FISICO: 'CF',
  ENTREGA: 'EN',
  // Unidades (nuevos/usados)
  VENTA_UNIDAD: 'VU',
  APARTADO_UNIDAD: 'AP',
  RECOMPRA_UNIDAD: 'RC',
  CITA_COMERCIAL: 'CV',
  // CRM / Caja
  OPORTUNIDAD: 'OP',
  CORTE_CAJA: 'CC',
} as const;

const ANCHO_CONSECUTIVO = 8;

/** Quita acentos y deja solo letras A-Z en mayúsculas. */
function soloLetras(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

// Palabras vacías que no aportan a las iniciales de una razón social.
const CONECTORES = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'EL',
  'LOS',
  'Y',
  'SA',
  'CV',
  'SAPI',
  'SC',
  'SRL',
]);

/**
 * Sugiere un prefijo de 3 letras a partir del nombre de la empresa. Toma la
 * inicial de cada palabra significativa; si no junta 3, completa con letras
 * del primer término. Es solo una sugerencia: el admin puede corregirla al
 * dar de alta el cliente.
 */
export function sugerirPrefijoEmpresa(nombre: string): string {
  const palabras = (nombre ?? '')
    .split(/\s+/)
    .map((p) => soloLetras(p))
    .filter((p) => p.length > 0);

  const significativas = palabras.filter((p) => !CONECTORES.has(p));
  // Iniciales de las palabras que aportan (sin conectores).
  const iniciales = significativas.map((p) => p[0]).join('');
  // Todas las letras del nombre, para el caso de pocas palabras.
  const letras = palabras.join('');

  // Con 3+ palabras significativas usamos sus iniciales (Autos Premium
  // Guadalajara → APG); si no, las primeras letras del nombre (Total
  // Dealer → TOT).
  const base = iniciales.length >= 3 ? iniciales : letras;
  const prefijo = base.slice(0, 3);
  return prefijo.length ? prefijo.padEnd(3, 'X') : 'XXX';
}

/** Normaliza un prefijo tecleado a 3 letras mayúsculas. */
export function normalizarPrefijo(prefijo: string): string {
  const limpio = soloLetras(prefijo).slice(0, 3);
  return limpio.length ? limpio.padEnd(3, 'X') : 'XXX';
}

/** Arma el código completo: prefijo + objeto + consecutivo con ceros. */
export function formarCodigoDocumento(
  prefijoEmpresa: string,
  codigoObjeto: string,
  consecutivo: number,
): string {
  return (
    normalizarPrefijo(prefijoEmpresa) +
    codigoObjeto +
    String(consecutivo).padStart(ANCHO_CONSECUTIVO, '0')
  );
}

/** Algo que sabe ejecutar SQL: DataSource, EntityManager o QueryRunner. */
export interface EjecutorSql {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
}

/**
 * Reserva atómicamente el siguiente consecutivo del documento (empresa, objeto)
 * y devuelve su código legible ya formado con el prefijo de la empresa. Es el
 * único punto donde se generan códigos de documentos; funciona igual dentro o
 * fuera de una transacción (pásale el EntityManager de la transacción).
 */
export async function siguienteCodigoDocumento(
  ejecutor: EjecutorSql,
  tenantId: string,
  codigoObjeto: string,
): Promise<{ consecutivo: number; codigo: string }> {
  const seqRows = await ejecutor.query<{ last_value: number }[]>(
    `INSERT INTO document_code_seq (tenant_id, object_code, last_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (tenant_id, object_code) DO UPDATE
       SET last_value = document_code_seq.last_value + 1
     RETURNING last_value`,
    [tenantId, codigoObjeto],
  );
  const consecutivo = seqRows[0]?.last_value ?? 1;
  const prefRows = await ejecutor.query<{ code_prefix: string | null }[]>(
    `SELECT code_prefix FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const prefijo = prefRows[0]?.code_prefix?.trim() || 'XXX';
  return { consecutivo, codigo: formarCodigoDocumento(prefijo, codigoObjeto, consecutivo) };
}
