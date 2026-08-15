/**
 * Paletas de marca que un cliente puede elegir para su NexDMS.
 *
 * Viven aquí, en el servidor, y no en cada aplicación: el mismo azul tiene que
 * salir igual en el DMS, en el portal de recepción del iPad, en los monitores
 * del taller y en los PDFs que se imprimen. Con la lista repetida en cada
 * front, la primera corrección de un tono se olvidaría en dos de los cuatro.
 *
 * Cada paleta declara solo cuatro anclas. El resto del sistema de diseño se
 * deriva de ellas con `color-mix`, así que añadir una paleta nueva es añadir
 * cuatro colores, no reescribir la hoja de estilos.
 *
 * Sobre los tonos: `primary` es el color de acción —botones, enlaces, estados
 * activos— y tiene que aguantar texto blanco encima, así que todas van con
 * suficiente profundidad para pasar el contraste AA en 14 px. `tinta` es el
 * gris oscuro de los encabezados, con un sesgo hacia el tono de la marca para
 * que lea como elegido y no como heredado.
 */
export interface PaletaMarca {
  id: string;
  nombre: string;
  /** Color de acción. Lleva texto blanco encima. */
  primary: string;
  /** El mismo, un paso más oscuro: hover, pulsado, encabezados de tabla. */
  primaryHover: string;
  /** Fondo tenue del mismo tono: filas resaltadas, chips, avisos suaves. */
  primarySoft: string;
  /** Gris oscuro de la tipografía y las bandas, sesgado hacia la marca. */
  tinta: string;
}

export const PALETAS: PaletaMarca[] = [
  {
    id: 'nexus',
    nombre: 'Nexus (predeterminada)',
    primary: '#105078',
    primaryHover: '#0C4062',
    primarySoft: '#F0F6FA',
    tinta: '#203848',
  },
  {
    id: 'acero',
    nombre: 'Acero',
    primary: '#37546B',
    primaryHover: '#2A4254',
    primarySoft: '#F1F4F7',
    tinta: '#1F2E3A',
  },
  {
    id: 'rojo-agencia',
    nombre: 'Rojo agencia',
    primary: '#B3261E',
    primaryHover: '#8E1E17',
    primarySoft: '#FBF0EF',
    tinta: '#2E1D1B',
  },
  {
    id: 'verde-bandera',
    nombre: 'Verde bandera',
    primary: '#15654A',
    primaryHover: '#0F4F3A',
    primarySoft: '#EDF6F2',
    tinta: '#1B2E28',
  },
  {
    id: 'grafito',
    nombre: 'Grafito',
    primary: '#3F4650',
    primaryHover: '#31373F',
    primarySoft: '#F3F4F6',
    tinta: '#22262C',
  },
  {
    id: 'ambar',
    nombre: 'Ámbar',
    // El ámbar puro no sostiene texto blanco; se baja hasta que sí lo hace.
    primary: '#9A5B12',
    primaryHover: '#7C480C',
    primarySoft: '#FBF3E7',
    tinta: '#2F2418',
  },
  {
    id: 'vino',
    nombre: 'Vino',
    primary: '#7A2140',
    primaryHover: '#601931',
    primarySoft: '#F9EFF2',
    tinta: '#2C1922',
  },
  {
    id: 'indigo',
    nombre: 'Índigo',
    primary: '#3B3A96',
    primaryHover: '#2E2D78',
    primarySoft: '#F1F1FA',
    tinta: '#232240',
  },
  {
    id: 'turquesa',
    nombre: 'Turquesa',
    primary: '#0F6E77',
    primaryHover: '#0B565D',
    primarySoft: '#EDF6F7',
    tinta: '#152E31',
  },
  {
    id: 'negro-oro',
    nombre: 'Negro y oro',
    primary: '#8A6A1F',
    primaryHover: '#6E5418',
    primarySoft: '#F8F4E9',
    tinta: '#1C1A15',
  },
];

export const PALETA_POR_OMISION = PALETAS[0];

export function paletaPorId(id: string | null | undefined): PaletaMarca {
  return PALETAS.find((p) => p.id === id) ?? PALETA_POR_OMISION;
}
