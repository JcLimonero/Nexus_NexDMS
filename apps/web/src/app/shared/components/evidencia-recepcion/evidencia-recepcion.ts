import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

import {
  ETIQUETAS_DANO,
  EvidenciaRecepcionService,
  MarcaEvidencia,
  UnidadEvidencia,
  VisitaEvidencia,
} from "./evidencia-recepcion.service";

/**
 * Cómo llegó la unidad: fotos de recepción y daños marcados, para consultar.
 *
 * Esto no es la recepción con los botones apagados: es otra pantalla. La
 * recepción sirve para capturar y solo se alcanza desde la agenda del día;
 * esto es lo que se mira meses después —al entregar la unidad, o cuando el
 * cliente dice que ese golpe no venía— y por eso vive donde se hace esa
 * pregunta: en la orden, en la ficha del vehículo y en el expediente del
 * cliente. No trae un solo control que escriba.
 *
 * Se le da UNO de los tres identificadores. Si no hay evidencia no se dibuja
 * nada: una orden abierta en mostrador, sin recepción guiada, no tiene por
 * qué enseñar una sección vacía.
 */
@Component({
  selector: "app-evidencia-recepcion",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./evidencia-recepcion.html",
  styleUrls: ["./evidencia-recepcion.scss"],
})
export class EvidenciaRecepcion {
  private srv = inject(EvidenciaRecepcionService);

  /** Una sola orden. */
  serviceOrderId = input<string | null>(null);
  /** Todas las visitas de una unidad. */
  vehicleId = input<string | null>(null);
  /** Todas las unidades de un cliente. */
  clientId = input<string | null>(null);
  /** La orden del cliente, por su liga de seguimiento y sin sesión. */
  token = input<string | null>(null);
  /**
   * Con título, el componente se envuelve en su propia tarjeta.
   *
   * La pone él y no quien lo usa porque la sección entera tiene que
   * desaparecer cuando no hay evidencia: una tarjeta vacía con el rótulo
   * "Cómo llegó la unidad" haría pensar que se perdieron las fotos.
   */
  titulo = input<string>("");
  subtitulo = input<string>("");

  cargando = signal(false);
  unidades = signal<UnidadEvidencia[]>([]);
  /** Marca cuyo detalle se está mostrando; null = ninguna. */
  marcaAbierta = signal<string | null>(null);

  /** Visitas sueltas cuando se preguntó por una orden o por una unidad. */
  visitas = signal<VisitaEvidencia[]>([]);

  hayAlgo = computed(
    () => this.visitas().length > 0 || this.unidades().length > 0,
  );

  constructor() {
    effect(() => {
      const orden = this.serviceOrderId();
      const vehiculo = this.vehicleId();
      const cliente = this.clientId();
      const token = this.token();
      this.marcaAbierta.set(null);

      if (orden) return this.cargar(this.srv.deOrden(orden));
      if (vehiculo) return this.cargar(this.srv.deVehiculo(vehiculo));
      if (token) return this.cargar(this.srv.deTokenPublico(token));
      if (cliente) {
        this.cargando.set(true);
        this.srv.deCliente(cliente).subscribe({
          next: (u) => {
            this.unidades.set(u);
            this.visitas.set([]);
            this.cargando.set(false);
          },
          // Sin evidencia la sección desaparece, que es lo mismo que ve quien
          // no tiene permiso. Un error rojo aquí solo estorbaría a quien vino
          // a mirar otra cosa.
          error: () => {
            this.unidades.set([]);
            this.cargando.set(false);
          },
        });
        return;
      }
      this.visitas.set([]);
      this.unidades.set([]);
    });
  }

  private cargar(fuente: {
    subscribe: (o: {
      next: (v: VisitaEvidencia[]) => void;
      error: () => void;
    }) => void;
  }): void {
    this.cargando.set(true);
    fuente.subscribe({
      next: (v) => {
        this.visitas.set(v);
        this.unidades.set([]);
        this.cargando.set(false);
      },
      error: () => {
        this.visitas.set([]);
        this.cargando.set(false);
      },
    });
  }

  etiqueta(tipo: string): string {
    return ETIQUETAS_DANO[tipo] ?? tipo;
  }

  /** Un toque sobre la marca abre su detalle; otro lo cierra. */
  alternarMarca(m: MarcaEvidencia): void {
    this.marcaAbierta.update((abierta) => (abierta === m.id ? null : m.id));
  }
}
