import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import { AlmacenService, PartScan } from "../almacen.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";

/** Un renglón del registro de lo procesado en la sesión de escaneo. */
interface RegistroEscaneo {
  sku: string;
  name: string;
  accion: string;
  detalle: string;
}

@Component({
  selector: "app-escaneo",
  standalone: true,
  imports: [MoneyPipe, CommonModule, FormsModule],
  templateUrl: "./escaneo.html",
  styleUrls: ["./escaneo.scss"],
})
export class Escaneo implements OnInit, AfterViewInit {
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  @ViewChild("scanInput") scanInput?: ElementRef<HTMLInputElement>;

  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");

  codigo = "";
  buscando = signal(false);
  parte = signal<PartScan | null>(null);
  registros = signal<RegistroEscaneo[]>([]);

  // Ajuste / entrada
  fisico: number | null = null;
  entradaQty = 0;
  entradaCosto = 0;
  procesando = signal(false);

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        const list = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(list);
        if (list.length && !this.branchId()) this.branchId.set(list[0].id);
      },
    });
  }

  ngAfterViewInit(): void {
    this.enfocar();
  }

  private enfocar(): void {
    setTimeout(() => this.scanInput?.nativeElement.focus(), 0);
  }

  onBranchChange(id: string): void {
    this.branchId.set(id);
    this.parte.set(null);
    this.enfocar();
  }

  /** Se dispara con Enter del lector de códigos o del teclado. */
  buscar(): void {
    const code = this.codigo.trim();
    if (!code) return;
    if (!this.branchId()) {
      this.toastr.warning("Selecciona la sucursal");
      return;
    }
    this.buscando.set(true);
    this.almacenService.scanPart(code, this.branchId()).subscribe({
      next: (p) => {
        this.buscando.set(false);
        // Las columnas decimales llegan como texto ("95.60"); se normalizan para
        // no mandar cadenas a los endpoints que esperan números.
        const parte: PartScan = {
          ...p,
          averageCost: Number(p.averageCost),
          publicPrice: Number(p.publicPrice),
          stockQuantity: Number(p.stockQuantity),
        };
        this.parte.set(parte);
        this.fisico = parte.stockQuantity;
        this.entradaQty = 0;
        this.entradaCosto = parte.averageCost;
        this.codigo = "";
      },
      error: (err) => {
        this.buscando.set(false);
        this.parte.set(null);
        this.toastr.error(err?.error?.message || "Código no encontrado");
        this.codigo = "";
        this.enfocar();
      },
    });
  }

  /** Ajusta la existencia del sistema a la cantidad física contada. */
  ajustarAFisico(): void {
    const p = this.parte();
    if (!p || this.procesando()) return;
    if (this.fisico === null || this.fisico < 0) {
      this.toastr.warning("Indica la existencia física");
      return;
    }
    const delta = this.fisico - p.stockQuantity;
    if (delta === 0) {
      this.toastr.info("La existencia física coincide con el sistema");
      this.enfocar();
      return;
    }
    this.procesando.set(true);
    this.almacenService
      .crearAjuste({
        partId: p.id,
        branchId: this.branchId(),
        type: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity: Math.abs(delta),
        notes: "Inventario rápido por escaneo",
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.registrar(p, "Ajuste", `${p.stockQuantity} → ${this.fisico}`);
          this.toastr.success("Existencia ajustada");
          this.parte.set(null);
          this.enfocar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo ajustar");
        },
      });
  }

  entrada(): void {
    const p = this.parte();
    if (!p || this.procesando()) return;
    if (this.entradaQty <= 0) {
      this.toastr.warning("La cantidad debe ser mayor a cero");
      return;
    }
    if (this.entradaCosto <= 0) {
      this.toastr.warning("El costo unitario debe ser mayor a cero");
      return;
    }
    this.procesando.set(true);
    this.almacenService
      .registrarEntrada({
        partId: p.id,
        branchId: this.branchId(),
        quantity: this.entradaQty,
        unitCost: this.entradaCosto,
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.registrar(
            p,
            "Entrada",
            `+${this.entradaQty} @ ${this.entradaCosto}`,
          );
          this.toastr.success("Entrada registrada");
          this.parte.set(null);
          this.enfocar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo registrar");
        },
      });
  }

  private registrar(p: PartScan, accion: string, detalle: string): void {
    this.registros.update((prev) => [
      { sku: p.sku, name: p.name, accion, detalle },
      ...prev,
    ]);
  }
}
