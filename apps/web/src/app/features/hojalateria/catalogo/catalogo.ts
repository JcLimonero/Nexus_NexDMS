import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { HojalateriaService, Pieza } from "../hojalateria.service";
import { ZONAS } from "../estados";

/** Catálogo de piezas de carrocería: fábrica (solo lectura) + propias del taller. */
@Component({
  selector: "app-hojalateria-catalogo",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./catalogo.html",
  styleUrls: ["../hojalateria.scss", "./catalogo.scss"],
})
export class Catalogo implements OnInit {
  private srv = inject(HojalateriaService);
  private toastr = inject(ToastrService);

  readonly zonas = ZONAS;

  piezas = signal<Pieza[]>([]);
  cargando = signal(true);
  nueva = signal<Partial<Pieza> | null>(null);

  deFabrica = computed(() => this.piezas().filter((p) => !p.tenantId));
  propias = computed(() => this.piezas().filter((p) => !!p.tenantId));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.catalogo().subscribe({
      next: (p) => {
        this.piezas.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudo cargar el catálogo");
      },
    });
  }

  etiquetaZona(z: string): string {
    return this.zonas.find((x) => x.value === z)?.label ?? z;
  }

  abrirNueva(): void {
    this.nueva.set({
      code: "",
      name: "",
      zone: "OTRO",
      defaultPrice: 0,
      isActive: true,
    });
  }

  cancelar(): void {
    this.nueva.set(null);
  }

  guardarNueva(): void {
    const n = this.nueva();
    if (!n?.code?.trim() || !n?.name?.trim()) {
      this.toastr.warning("Código y nombre son obligatorios");
      return;
    }
    this.srv
      .crearPieza({
        code: n.code,
        name: n.name,
        zone: n.zone,
        defaultPrice: Number(n.defaultPrice) || 0,
      })
      .subscribe({
        next: () => {
          this.toastr.success("Pieza agregada");
          this.nueva.set(null);
          this.cargar();
        },
        error: (e) =>
          this.toastr.error(e?.error?.message || "No se pudo guardar"),
      });
  }

  guardarPieza(p: Pieza): void {
    this.srv
      .actualizarPieza(p.id, {
        name: p.name,
        zone: p.zone,
        defaultPrice: Number(p.defaultPrice) || 0,
        isActive: p.isActive,
      })
      .subscribe({
        next: () => this.toastr.success("Pieza actualizada"),
        error: (e) =>
          this.toastr.error(e?.error?.message || "No se pudo guardar"),
      });
  }

  eliminar(p: Pieza): void {
    if (!confirm(`¿Eliminar la pieza "${p.name}"?`)) return;
    this.srv.eliminarPieza(p.id).subscribe({
      next: () => {
        this.toastr.success("Pieza eliminada");
        this.cargar();
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo eliminar"),
    });
  }
}
