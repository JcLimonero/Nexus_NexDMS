import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Phase } from "../../shared/components/phase-tracker/phase-tracker";
import {
  BoardItem,
  PhaseBoard,
} from "../../shared/components/phase-board/phase-board";

interface ProcesoCfg {
  key: string;
  label: string;
  endpoint: string;
  paginated: boolean;
  phases: Phase[];
  detailRoute?: string; // ruta base; se navega detailRoute/:id
}

const F = (key: string, label: string): Phase => ({ key, label });

/**
 * Tablero de seguimiento: una pestaña por proceso, columnas por fase y tarjetas
 * por documento. Lee los listados que ya existen y los normaliza a BoardItem.
 */
@Component({
  selector: "app-seguimiento",
  standalone: true,
  imports: [CommonModule, PhaseBoard],
  templateUrl: "./seguimiento-page.html",
  styleUrls: ["./seguimiento-page.scss"],
})
export class SeguimientoPage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly procesos: ProcesoCfg[] = [
    {
      key: "os", label: "Órdenes de servicio",
      endpoint: "/api/v1/service-orders", paginated: true,
      detailRoute: "/workshop/service-orders",
      phases: [
        F("RECEIVED", "Recibido"), F("DIAGNOSIS", "Diagnóstico"),
        F("IN_PROGRESS", "En proceso"), F("WAITING_PARTS", "Esperando refacción"),
        F("READY", "Listo"), F("DELIVERED", "Entregado"),
      ],
    },
    {
      key: "cot", label: "Cotizaciones",
      endpoint: "/api/v1/quotations", paginated: true,
      phases: [
        F("DRAFT", "Borrador"), F("PENDING_APPROVAL", "Por aprobar"),
        F("APPROVED", "Aprobada"), F("SENT", "Enviada"),
        F("ACCEPTED", "Aceptada"), F("CONVERTED", "Convertida"),
      ],
    },
    {
      key: "oc", label: "Pedidos a proveedor",
      endpoint: "/api/v1/purchase-orders", paginated: true,
      phases: [
        F("DRAFT", "Borrador"), F("SENT", "Enviado"),
        F("PARTIAL", "Parcial"), F("RECEIVED", "Recibido"),
      ],
    },
    {
      key: "gar", label: "Garantías",
      endpoint: "/api/v1/warranties", paginated: true,
      phases: [
        F("OPEN", "Abierta"), F("IN_PROGRESS", "En proceso"),
        F("RESOLVED", "Resuelta"),
      ],
    },
    {
      key: "hp", label: "Hojalatería",
      endpoint: "/api/v1/bodywork", paginated: false,
      detailRoute: "/bodywork",
      phases: [
        F("RECEIVED", "Recibido"), F("IN_PROGRESS", "En proceso"),
        F("READY", "Listo"), F("DELIVERED", "Entregado"),
      ],
    },
    {
      key: "ap", label: "Apartados",
      endpoint: "/api/v1/unit-reservations", paginated: false,
      phases: [F("ACTIVE", "Activo"), F("CONVERTED", "Convertido")],
    },
    {
      key: "vu", label: "Ventas de unidad",
      endpoint: "/api/v1/unit-sales", paginated: false,
      phases: [F("IN_PROGRESS", "En proceso"), F("COMPLETED", "Completada")],
    },
    {
      key: "cita", label: "Citas de servicio",
      endpoint: "/api/v1/appointments", paginated: true,
      phases: [
        F("PENDING_CONFIRMATION", "Por confirmar"), F("SCHEDULED", "Agendada"),
        F("CONFIRMED", "Confirmada"), F("COMPLETED", "Atendida"),
      ],
    },
    {
      key: "citav", label: "Citas comerciales",
      endpoint: "/api/v1/sales-appointments", paginated: false,
      phases: [
        F("SCHEDULED", "Agendada"), F("CONFIRMED", "Confirmada"),
        F("DONE", "Realizada"),
      ],
    },
  ];

  activo = signal<string>("os");
  loading = signal(false);
  items = signal<BoardItem[]>([]);

  readonly cfg = computed(
    () => this.procesos.find((p) => p.key === this.activo()) ?? this.procesos[0],
  );

  ngOnInit(): void {
    this.cargar();
  }

  elegir(key: string): void {
    if (key === this.activo()) return;
    this.activo.set(key);
    this.cargar();
  }

  private nombre(it: Record<string, unknown>): string {
    if (typeof it["clientName"] === "string" && it["clientName"]) {
      return it["clientName"] as string;
    }
    const o = (it["client"] ?? it["owner"]) as Record<string, unknown> | undefined;
    if (o) {
      if (o["companyName"]) return o["companyName"] as string;
      const n = [o["firstName"], o["lastName"]].filter(Boolean).join(" ");
      if (n) return n;
    }
    return "—";
  }

  private codigo(it: Record<string, unknown>): string {
    return (
      (it["folio"] as string) ||
      (it["ticketNumber"] as string) ||
      "#" + String(it["id"] ?? "").slice(0, 6)
    );
  }

  private cargar(): void {
    const cfg = this.cfg();
    this.loading.set(true);
    this.items.set([]);
    this.http.get<unknown>(cfg.endpoint).subscribe({
      next: (resp) => {
        const arr = cfg.paginated
          ? ((resp as { data?: unknown[] }).data ?? [])
          : (resp as unknown[]);
        const items: BoardItem[] = (arr as Record<string, unknown>[]).map(
          (it) => ({
            id: String(it["id"] ?? ""),
            code: this.codigo(it),
            title: this.nombre(it),
            phaseKey: String(it["status"] ?? ""),
          }),
        );
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  abrir(id: string): void {
    const cfg = this.cfg();
    if (cfg.detailRoute) void this.router.navigate([cfg.detailRoute, id]);
  }
}
