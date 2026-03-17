import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { ClientesService } from "../../../clientes/clientes.service";
import { ClientSelector } from "../../../clientes/client-selector/client-selector";
import { CatalogUnit } from "../../models/catalog-unit.model";
import { ClientListItem } from "../../../clientes/models/client.model";

@Component({
  selector: "app-unidad-recompra",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ClientSelector],
  templateUrl: "./unidad-recompra.html",
  styleUrls: ["./unidad-recompra.scss"],
})
export class UnidadRecompra implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioUnidadesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  unidad = signal<CatalogUnit | null>(null);
  clients = signal<ClientListItem[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/inventario-unidades"]);
      return;
    }

    this.form = this.fb.group({
      clientId: ["", Validators.required],
      returnDate: [new Date().toISOString().split("T")[0], Validators.required],
      buybackPrice: [0, [Validators.required, Validators.min(0)]],
      mileage: [null as number | null, [Validators.min(0)]],
      notes: [""],
    });

    this.inventarioService.getUnit(id).subscribe({
      next: (u) => {
        this.unidad.set(u);
        const allowed =
          u.status === "SOLD" || u.status === "PENDING_EXPEDIENTE";
        if (!allowed) {
          this.toastr.warning(
            "Solo se puede registrar recompra de unidades vendidas o seminuevas con expediente pendiente"
          );
          this.router.navigate(["/inventario-unidades", id]);
        }
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar unidad");
        this.router.navigate(["/inventario-unidades"]);
      },
    });

    this.loadClients();
  }

  loadClients(): void {
    this.clientesService.getAll({ limit: 50 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) return;

    const raw = this.form.getRawValue();
    this.loading.set(true);
    this.inventarioService
      .createUnitReturn({
        catalogUnitId: id,
        clientId: raw.clientId,
        returnDate: raw.returnDate,
        buybackPrice: Number(raw.buybackPrice),
        mileage: raw.mileage ? Number(raw.mileage) : undefined,
        notes: raw.notes || undefined,
      })
      .subscribe({
        next: (res) => {
          this.toastr.success("Recompra registrada");
          this.router.navigate([
            "/inventario-unidades",
            id,
            "recompra",
            res.id,
            "expediente",
          ]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al registrar recompra");
        },
      });
  }

  getDisplayName(client: ClientListItem): string {
    return this.clientesService.getDisplayName(client);
  }
}
