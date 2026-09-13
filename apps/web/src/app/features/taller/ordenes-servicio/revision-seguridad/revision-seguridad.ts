import {
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

/** Punto del catálogo de revisión (llantas, balatas, …). */
interface Punto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

/** Evaluación guardada de un punto en esta orden. */
interface Evaluacion {
  itemId: string;
  status: string;
  notes: string | null;
}

/** Estatus posibles con su etiqueta y color de semáforo. */
const ESTADOS = [
  { value: "BUENO", label: "Bueno", color: "#1E9E5A" },
  { value: "REGULAR", label: "Regular", color: "#D89A15" },
  { value: "MALO", label: "Malo", color: "#C0392B" },
  { value: "REEMPLAZAR", label: "Reemplazar", color: "#C0392B" },
];

/**
 * Captura de la revisión de puntos de seguridad de una orden de taller: el
 * mecánico marca el semáforo de cada punto (del catálogo del tenant) y su nota.
 * Al guardar, el "Informe de revisión" (PDF) sale con estos datos. Incluye el
 * mini-CRUD del catálogo para dar de alta/quitar puntos.
 */
@Component({
  selector: "app-revision-seguridad",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./revision-seguridad.html",
})
export class RevisionSeguridad implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  @Input({ required: true }) serviceOrderId!: string;

  readonly estados = ESTADOS;

  cargando = signal(true);
  guardando = signal(false);
  puntos = signal<Punto[]>([]);
  /** Estado editable por punto: itemId → { status, notes }. */
  form = signal<Record<string, { status: string; notes: string }>>({});

  // Administración del catálogo
  adminAbierto = signal(false);
  nuevoCode = signal("");
  nuevoName = signal("");
  agregando = signal(false);

  hayPuntos = computed(() => this.puntos().length > 0);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.http.get<Punto[]>("/api/v1/mechanic-checklist/items").subscribe({
      next: (items) => {
        this.puntos.set(
          [...items].sort((a, b) => a.sortOrder - b.sortOrder),
        );
        this.cargarEvaluaciones();
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudo cargar el catálogo de puntos");
      },
    });
  }

  private cargarEvaluaciones(): void {
    this.http
      .get<Evaluacion[]>(
        `/api/v1/service-orders/${this.serviceOrderId}/safety-checklist`,
      )
      .subscribe({
        next: (evals) => {
          const f: Record<string, { status: string; notes: string }> = {};
          for (const p of this.puntos()) f[p.id] = { status: "", notes: "" };
          for (const e of evals) {
            // La última evaluación por punto (el API ordena desc).
            if (f[e.itemId] && !f[e.itemId].status) {
              f[e.itemId] = { status: e.status, notes: e.notes ?? "" };
            }
          }
          this.form.set(f);
          this.cargando.set(false);
        },
        error: () => {
          const f: Record<string, { status: string; notes: string }> = {};
          for (const p of this.puntos()) f[p.id] = { status: "", notes: "" };
          this.form.set(f);
          this.cargando.set(false);
        },
      });
  }

  setStatus(itemId: string, status: string): void {
    this.form.update((f) => ({
      ...f,
      [itemId]: { status: f[itemId]?.status === status ? "" : status, notes: f[itemId]?.notes ?? "" },
    }));
  }

  setNotes(itemId: string, notes: string): void {
    this.form.update((f) => ({
      ...f,
      [itemId]: { status: f[itemId]?.status ?? "", notes },
    }));
  }

  colorDe(status: string): string {
    return this.estados.find((e) => e.value === status)?.color ?? "#5A6B78";
  }

  guardar(): void {
    const f = this.form();
    const items = Object.entries(f)
      .filter(([, v]) => v.status)
      .map(([itemId, v]) => ({
        itemId,
        status: v.status,
        notes: v.notes?.trim() || undefined,
      }));
    if (!items.length) {
      this.toastr.warning("Marca el estado de al menos un punto");
      return;
    }
    this.guardando.set(true);
    this.http
      .post(
        `/api/v1/service-orders/${this.serviceOrderId}/safety-checklist`,
        { items },
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Revisión guardada");
        },
        error: (e) => {
          this.guardando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo guardar");
        },
      });
  }

  // ── Catálogo de puntos ──
  agregarPunto(): void {
    const code = this.nuevoCode().trim().toUpperCase();
    const name = this.nuevoName().trim();
    if (!code || !name) {
      this.toastr.warning("Indica clave y nombre del punto");
      return;
    }
    this.agregando.set(true);
    this.http
      .post("/api/v1/mechanic-checklist/items", {
        code,
        name,
        sortOrder: this.puntos().length,
      })
      .subscribe({
        next: () => {
          this.agregando.set(false);
          this.nuevoCode.set("");
          this.nuevoName.set("");
          this.toastr.success("Punto agregado");
          this.cargar();
        },
        error: (e) => {
          this.agregando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo agregar");
        },
      });
  }

  eliminarPunto(p: Punto): void {
    if (!confirm(`¿Quitar "${p.name}" del catálogo de puntos?`)) return;
    this.http
      .delete(`/api/v1/mechanic-checklist/items/${p.id}`)
      .subscribe({
        next: () => {
          this.toastr.success("Punto eliminado");
          this.cargar();
        },
        error: (e) =>
          this.toastr.error(e?.error?.message || "No se pudo eliminar"),
      });
  }
}
