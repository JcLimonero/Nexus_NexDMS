import { Injectable, signal } from "@angular/core";

/**
 * Dictado por voz con el reconocimiento del propio navegador.
 *
 * Es la diferencia entre que el técnico reporte un hallazgo o no lo reporte:
 * escribir en un teléfono con las manos sucias no se hace, y hablarle sí.
 *
 * No se manda audio a ningún servidor: el reconocimiento ocurre en el
 * dispositivo o en el servicio del propio navegador, y aquí solo llega el
 * texto ya transcrito.
 */
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface VentanaConVoz extends Window {
  SpeechRecognition?: new () => Reconocedor;
  webkitSpeechRecognition?: new () => Reconocedor;
}

@Injectable({ providedIn: "root" })
export class DictadoService {
  /** Si el navegador no lo soporta, la UI simplemente no ofrece el botón. */
  readonly soportado = signal(false);
  readonly escuchando = signal(false);
  readonly error = signal<string | null>(null);

  private reconocedor: Reconocedor | null = null;

  constructor() {
    const w = window as VentanaConVoz;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    this.soportado.set(!!Ctor);
  }

  /**
   * Empieza a escuchar y va entregando el texto conforme se reconoce.
   * `alTexto` recibe la transcripción acumulada de esta sesión de dictado.
   */
  iniciar(alTexto: (texto: string) => void): void {
    const w = window as VentanaConVoz;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor || this.escuchando()) return;

    const r = new Ctor();
    r.lang = "es-MX";
    r.continuous = true;
    // Los parciales dan sensación de respuesta inmediata mientras habla.
    r.interimResults = true;

    let confirmado = "";
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alternativa = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) confirmado += alternativa;
        else parcial += alternativa;
      }
      alTexto((confirmado + parcial).trim());
    };
    r.onerror = (e) => {
      this.error.set(
        e.error === "not-allowed"
          ? "Falta permiso del micrófono"
          : "No se pudo escuchar",
      );
      this.detener();
    };
    r.onend = () => this.escuchando.set(false);

    this.reconocedor = r;
    this.error.set(null);
    this.escuchando.set(true);
    r.start();
  }

  detener(): void {
    this.reconocedor?.stop();
    this.reconocedor = null;
    this.escuchando.set(false);
  }

  alternar(alTexto: (texto: string) => void): void {
    if (this.escuchando()) this.detener();
    else this.iniciar(alTexto);
  }
}
