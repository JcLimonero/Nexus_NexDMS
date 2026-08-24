import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { Convenio, FlotillasService } from "../flotillas.service";

/** Bandeja de convenios de flotilla. */
@Component({
  selector: "app-flotillas-lista",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./lista.html",
  styleUrls: ["../flotillas.scss"],
})
export class Lista implements OnInit {
  private srv = inject(FlotillasService);
  private toastr = inject(ToastrService);

  convenios = signal<Convenio[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (c) => {
        this.convenios.set(c);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudieron cargar los convenios");
      },
    });
  }

  descuentoResumen(c: Convenio): string {
    const p: string[] = [];
    if (c.partsPriceListId) p.push("Lista ref.");
    else if (c.partsDiscountPct) p.push(`Ref. ${c.partsDiscountPct}%`);
    if (c.laborDiscountPct) p.push(`MO ${c.laborDiscountPct}%`);
    if (c.unitSaleDiscountPct) p.push(`Unidad ${c.unitSaleDiscountPct}%`);
    return p.length ? p.join(" · ") : "—";
  }
}
