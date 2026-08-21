import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import {
  BodyworkStatus,
  HojalateriaService,
  OrdenLista,
} from "../hojalateria.service";
import { ESTADOS } from "../estados";

/** Bandeja de órdenes de Hojalatería y Pintura. */
@Component({
  selector: "app-hojalateria-lista",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./lista.html",
  styleUrls: ["../hojalateria.scss"],
})
export class Lista implements OnInit {
  private srv = inject(HojalateriaService);
  private toastr = inject(ToastrService);

  readonly estados = ESTADOS;

  ordenes = signal<OrdenLista[]>([]);
  cargando = signal(true);
  filtro = signal<BodyworkStatus | "">("");

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar(this.filtro() || undefined).subscribe({
      next: (o) => {
        this.ordenes.set(o);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudieron cargar las órdenes");
      },
    });
  }

  filtrar(status: BodyworkStatus | ""): void {
    this.filtro.set(status);
    this.cargar();
  }

  etiquetaEstado(s: string): string {
    return this.estados.find((e) => e.value === s)?.label ?? s;
  }

  vehiculo(o: OrdenLista): string {
    return [o.vehicleBrand, o.vehicleModel, o.vehiclePlate]
      .filter(Boolean)
      .join(" · ");
  }
}
