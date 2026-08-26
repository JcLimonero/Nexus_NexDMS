import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * Panel de resultados del módulo WhatsApp (prototipo, datos demo).
 *
 * Su único fin es comercial: mostrarle al cliente, con números, que el módulo
 * le genera citas y le ahorra trabajo. Todo es demo; en producción sale de los
 * mismos registros de uso y de las citas atribuidas a WhatsApp.
 */

interface FunnelStep {
  label: string;
  value: number;
}

@Component({
  selector: "app-wa-panel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./panel.html",
  styleUrls: ["./panel.scss"],
})
export class Panel {
  readonly periodo = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Embudo de prospección (avisos de servicio + recordatorios).
  readonly enviados = 1066;
  readonly entregados = 1020;
  readonly leidos = 892;
  readonly respondieron = 410;
  readonly agendadas = 268;

  // Contexto del taller y del negocio.
  readonly citasTotalTaller = 420;
  readonly ticketPromedio = 3200;
  readonly costoPeriodo = 2351.2;
  readonly reagendadas = 74;

  // Confirmación / asistencia.
  readonly noShowAntes = 22; // % antes del módulo
  readonly noShowDespues = 9; // % con el módulo

  // Agente.
  readonly resueltasBot = 0.71; // proporción sin asesor
  readonly tiempoRespuestaSeg = 12;

  readonly funnel = signal<FunnelStep[]>([
    { label: "Mensajes enviados", value: this.enviados },
    { label: "Entregados", value: this.entregados },
    { label: "Leídos", value: this.leidos },
    { label: "Respondieron", value: this.respondieron },
    { label: "Agendaron cita", value: this.agendadas },
  ]);

  readonly convAvisoCita = computed(() => this.agendadas / this.enviados);
  readonly pctViaWhats = computed(() => this.agendadas / this.citasTotalTaller);
  readonly costoPorCita = computed(() => this.costoPeriodo / this.agendadas);
  readonly ingresoAtribuible = computed(() => this.agendadas * this.ticketPromedio);
  readonly roi = computed(() => this.ingresoAtribuible() / this.costoPeriodo);
  readonly noShowReduccion = computed(() => this.noShowAntes - this.noShowDespues);

  /** Ancho de la barra del embudo, en % respecto del primer paso. */
  barWidth(v: number): number {
    return Math.round((v / this.enviados) * 100);
  }
  /** % de conversión respecto del primer paso. */
  stepPct(v: number): number {
    return Math.round((v / this.enviados) * 100);
  }
  readonly resueltasBotPct = computed(() => Math.round(this.resueltasBot * 100));
}
