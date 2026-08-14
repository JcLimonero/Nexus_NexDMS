import { signal } from "@angular/core";

/**
 * El eje de horas que comparten los dos tableros.
 *
 * Vive aquí y no en cada pantalla porque si las ventanas divergieran, el
 * tablero del taller y el de citas dibujarían la misma hora en sitios
 * distintos y colgados uno al lado del otro se notaría.
 */
export const HORA_INICIO = 7;
export const HORA_FIN = 20;

export class LineaDeTiempo {
  readonly horas = Array.from(
    { length: HORA_FIN - HORA_INICIO + 1 },
    (_, i) => HORA_INICIO + i,
  );

  /** Minutos desde el inicio del eje; lo mueve el latido. */
  private readonly ahoraMin = signal<number>(-1);

  private get rango(): number {
    return (HORA_FIN - HORA_INICIO) * 60;
  }

  /** Dónde va la línea de la hora. Fuera de la ventana no se dibuja. */
  posicionAhora(): number | null {
    const pct = (this.ahoraMin() / this.rango) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  }

  /**
   * Mueve la línea. Con una fecha del servidor cuando se acaba de recibir,
   * y sin ella entre refrescos, que el tiempo corre igual.
   */
  mover(desde?: Date): void {
    const ahora = desde ?? new Date();
    this.ahoraMin.set(
      (ahora.getHours() - HORA_INICIO) * 60 + ahora.getMinutes(),
    );
  }

  /** Posición de un instante, acotada al eje. */
  posicion(fecha: Date): number {
    const min = (fecha.getHours() - HORA_INICIO) * 60 + fecha.getMinutes();
    return Math.max(0, Math.min(100, (min / this.rango) * 100));
  }

  /** Posición de un `HH:MM`, para las franjas de turno. */
  posicionHora(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return Math.max(0, Math.min(100, (((h - HORA_INICIO) * 60 + m) / this.rango) * 100));
  }

  /**
   * Ancho de un bloque de esa duración, sin salirse del eje. El mínimo evita
   * que una cita corta quede en una raya de dos píxeles.
   */
  ancho(izquierda: number, minutos: number): number {
    return Math.min(
      100 - izquierda,
      Math.max(1.5, (minutos / this.rango) * 100),
    );
  }

  /** Solo la hora: con "07:00" en cada columna las etiquetas se tocaban. */
  etiqueta(h: number): string {
    return String(h).padStart(2, "0");
  }
}
