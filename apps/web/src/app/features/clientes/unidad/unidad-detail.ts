import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { forkJoin } from "rxjs";

import { ClientesService } from "../clientes.service";
import {
  CustomerVehicle,
  VehicleServiceHistoryItem,
} from "../models/client.model";

@Component({
  selector: "app-unidad-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./unidad-detail.html",
  styleUrls: ["./unidad-detail.scss"],
})
export class UnidadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private clientesService = inject(ClientesService);

  clientId = signal<string>("");
  vehicle = signal<CustomerVehicle | null>(null);
  orders = signal<VehicleServiceHistoryItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get("id");
    const vehicleId = this.route.snapshot.paramMap.get("vehicleId");
    if (!clientId || !vehicleId) {
      this.error.set("Ruta inválida");
      this.loading.set(false);
      return;
    }
    this.clientId.set(clientId);

    forkJoin({
      vehicle: this.clientesService.getVehicle(clientId, vehicleId),
      orders: this.clientesService.getVehicleServiceHistory(
        clientId,
        vehicleId,
      ),
    }).subscribe({
      next: ({ vehicle, orders }) => {
        this.vehicle.set(vehicle);
        this.orders.set(orders);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar la unidad");
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RECEIVED: "Recibida",
      DIAGNOSIS: "Diagnóstico",
      IN_PROGRESS: "En progreso",
      WAITING_PARTS: "Esperando refacciones",
      READY: "Lista para entregar",
      DELIVERED: "Entregada",
      CANCELLED: "Cancelada",
    };
    return labels[status] ?? status;
  }
}
