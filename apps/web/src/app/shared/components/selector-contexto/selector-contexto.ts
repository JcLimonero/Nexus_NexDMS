import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface SucursalAccesible {
  branchId: string;
  branchName: string;
  legalEntityId: string;
  legalEntityName: string;
}

interface Contexto {
  branchId: string;
  legalEntityId: string;
  scope: "GLOBAL" | "LEGAL_ENTITY" | "SUCURSAL";
  branches: SucursalAccesible[];
}

/**
 * Selector de contexto: en qué sucursal está trabajando el usuario.
 *
 * La organización es grupo → razón social → sucursal, y el alcance del usuario
 * filtra lo que ve. Quien tiene acceso a varias sucursales necesita poder
 * moverse entre ellas sin volver a entrar; los endpoints existían desde el
 * principio pero nadie los llamaba.
 *
 * Si solo hay una sucursal accesible no se dibuja nada: un selector con una
 * sola opción es ruido.
 */
@Component({
  selector: "app-selector-contexto",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (sucursales().length > 1) {
      <div class="contexto">
        <label class="contexto-etiqueta" for="ctx-sucursal">
          {{ razonActual() }}
        </label>
        <select
          id="ctx-sucursal"
          class="contexto-select"
          [disabled]="cambiando()"
          [value]="branchId()"
          (change)="cambiar($any($event.target).value)"
        >
          @for (s of sucursales(); track s.branchId) {
            <option [value]="s.branchId">{{ s.branchName }}</option>
          }
        </select>
      </div>
    }
  `,
  styleUrls: ["./selector-contexto.scss"],
})
export class SelectorContexto implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  sucursales = signal<SucursalAccesible[]>([]);
  branchId = signal<string>("");
  cambiando = signal(false);

  /** Razón social de la sucursal activa, como contexto del selector. */
  razonActual = computed(() => {
    const actual = this.sucursales().find((s) => s.branchId === this.branchId());
    return actual?.legalEntityName ?? "Sucursal";
  });

  ngOnInit(): void {
    this.http.get<Contexto>("/api/v1/auth/me").subscribe({
      next: (c) => {
        this.sucursales.set(c.branches ?? []);
        this.branchId.set(c.branchId);
      },
      // Sin contexto el selector simplemente no aparece; no vale la pena
      // molestar al usuario con un error por algo secundario.
      error: () => undefined,
    });
  }

  cambiar(branchId: string): void {
    if (!branchId || branchId === this.branchId() || this.cambiando()) return;
    this.cambiando.set(true);
    this.http
      .post<{ accessToken?: string }>("/api/v1/auth/switch-branch", { branchId })
      .subscribe({
        next: (r) => {
          // El token nuevo lleva la sucursal y la razón social recalculadas:
          // sin reemplazarlo, el resto de pantallas seguiría con el anterior.
          if (r?.accessToken) {
            localStorage.setItem("nexdms_accessToken", r.accessToken);
          }
          const destino = this.sucursales().find((s) => s.branchId === branchId);
          this.toastr.success(`Trabajando en ${destino?.branchName ?? "la sucursal"}`);
          // Se recarga para que cada pantalla vuelva a pedir sus datos con el
          // alcance nuevo, en vez de arrastrar lo que ya tenía en memoria.
          location.reload();
        },
        error: (e) => {
          this.cambiando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo cambiar de sucursal");
        },
      });
  }
}
