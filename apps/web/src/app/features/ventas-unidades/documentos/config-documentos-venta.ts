import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  DocumentosVentaService,
  ETIQUETA_CLIENTE,
  ETIQUETA_VENTA,
  ReglaDocumento,
  TipoDocumento,
} from "./documentos-venta.service";

interface FormTipo {
  id?: string;
  key: string;
  name: string;
  scope: "CLIENT" | "SALE";
  hasExpiration: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface FormRegla {
  documentTypeId: string;
  clientType: string;
  financingType: string;
  vehicleCategory: string;
  isRequired: boolean;
}

/**
 * Configuración de los documentos de venta: el catálogo de tipos y la matriz
 * de requisitos.
 *
 * Dos tablas en una pantalla porque se editan juntas: se da de alta un tipo y
 * enseguida se dice para qué combinación se exige. La matriz usa "cualquiera"
 * en un eje para no repetir la regla por cada valor.
 */
@Component({
  selector: "app-config-documentos-venta",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./config-documentos-venta.html",
  styleUrls: ["./config-documentos-venta.scss"],
})
export class ConfigDocumentosVenta implements OnInit {
  private srv = inject(DocumentosVentaService);
  private toastr = inject(ToastrService);

  tipos = signal<TipoDocumento[]>([]);
  reglas = signal<ReglaDocumento[]>([]);
  cargando = signal(true);

  readonly clientes = Object.entries(ETIQUETA_CLIENTE);
  readonly ventas = Object.entries(ETIQUETA_VENTA);
  categorias = signal<{ code: string; label: string }[]>([]);

  /** Empieza en Reglas: es lo que se consulta y ajusta a diario. */
  pestana = signal<"reglas" | "catalogo">("reglas");

  // Alta/edición de tipo
  tipoAbierto = signal(false);
  formTipo: FormTipo = this.tipoVacio();

  // Alta de regla
  formRegla: FormRegla = this.reglaVacia();

  tiposActivos = computed(() => this.tipos().filter((t) => t.isActive));

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.categoriasVehiculo().subscribe({
      next: (c) => this.categorias.set(c),
    });
    this.srv.tipos().subscribe({
      next: (t) => {
        this.tipos.set(t);
        this.srv.reglas().subscribe({
          next: (r) => {
            this.reglas.set(r);
            this.cargando.set(false);
          },
          error: () => this.cargando.set(false),
        });
      },
      error: () => this.cargando.set(false),
    });
  }

  nombreTipo(id: string): string {
    return this.tipos().find((t) => t.id === id)?.name ?? "—";
  }

  etiquetaEje(
    tipo: "cliente" | "venta" | "categoria",
    valor: string | null,
  ): string {
    if (!valor) return "Cualquiera";
    if (tipo === "categoria") {
      return this.categorias().find((c) => c.code === valor)?.label ?? valor;
    }
    return (tipo === "cliente" ? ETIQUETA_CLIENTE : ETIQUETA_VENTA)[valor] ?? valor;
  }

  // ── Tipos ──
  private tipoVacio(): FormTipo {
    return {
      key: "",
      name: "",
      scope: "SALE",
      hasExpiration: false,
      sortOrder: (this.tipos().length + 1) * 10,
      isActive: true,
    };
  }

  nuevoTipo(): void {
    this.formTipo = this.tipoVacio();
    this.tipoAbierto.set(true);
  }

  editarTipo(t: TipoDocumento): void {
    this.formTipo = { ...t };
    this.tipoAbierto.set(true);
  }

  guardarTipo(): void {
    if (!this.formTipo.key.trim() || !this.formTipo.name.trim()) {
      this.toastr.warning("Clave y nombre son requeridos");
      return;
    }
    this.srv.guardarTipo(this.formTipo).subscribe({
      next: () => {
        this.tipoAbierto.set(false);
        this.toastr.success("Tipo guardado");
        this.cargar();
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo guardar"),
    });
  }

  eliminarTipo(t: TipoDocumento): void {
    if (!confirm(`¿Quitar "${t.name}" del catálogo?`)) return;
    this.srv.eliminarTipo(t.id).subscribe({
      next: (r: unknown) => {
        const res = r as { desactivado?: boolean };
        this.toastr.success(
          res?.desactivado
            ? "Estaba en uso: se desactivó en vez de borrarse"
            : "Tipo eliminado",
        );
        this.cargar();
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo quitar"),
    });
  }

  // ── Reglas ──
  private reglaVacia(): FormRegla {
    return {
      documentTypeId: "",
      clientType: "",
      financingType: "",
      vehicleCategory: "",
      isRequired: true,
    };
  }

  agregarRegla(): void {
    if (!this.formRegla.documentTypeId) {
      this.toastr.warning("Elige el documento");
      return;
    }
    this.srv
      .guardarRegla({
        documentTypeId: this.formRegla.documentTypeId,
        clientType: this.formRegla.clientType || null,
        financingType: this.formRegla.financingType || null,
        vehicleCategory: this.formRegla.vehicleCategory || null,
        isRequired: this.formRegla.isRequired,
      })
      .subscribe({
        next: () => {
          this.formRegla = this.reglaVacia();
          this.toastr.success("Regla agregada");
          this.cargar();
        },
        error: (e) =>
          this.toastr.error(e?.error?.message || "No se pudo agregar"),
      });
  }

  quitarRegla(r: ReglaDocumento): void {
    this.srv.eliminarRegla(r.id).subscribe({
      next: () => this.cargar(),
    });
  }
}
