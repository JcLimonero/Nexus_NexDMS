import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { ClientesService } from "../clientes.service";
import { EvidenciaRecepcion } from "../../../shared/components/evidencia-recepcion/evidencia-recepcion";
import { Client } from "../models/client.model";
import {
  FichaVehiculo,
  RelacionesService,
  VehiculoDelCliente,
} from "./relaciones.service";

/**
 * Quién tiene qué, y qué se le ha hecho.
 *
 * Las dos relaciones —cliente con sus vehículos, y vehículo con sus
 * servicios— se resuelven en la misma pantalla porque siempre se recorren
 * juntas: quien pregunta por un cliente acaba preguntando por la unidad, y
 * quien pregunta por una unidad acaba preguntando de quién era.
 *
 * Se lee de izquierda a derecha: cliente → sus vehículos → la ficha de uno.
 */
@Component({
  selector: "app-relaciones",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EvidenciaRecepcion],
  templateUrl: "./relaciones.html",
  styleUrls: ["./relaciones.scss"],
})
export class Relaciones implements OnInit {
  private srv = inject(RelacionesService);
  private clientesSrv = inject(ClientesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  busqueda = "";
  resultados = signal<Client[]>([]);
  buscando = signal(false);

  cliente = signal<Client | null>(null);
  vehiculos = signal<VehiculoDelCliente[]>([]);
  ficha = signal<FichaVehiculo | null>(null);
  /** Servicio cuyo detalle de recepción está desplegado; null = ninguno. */
  servicioAbierto = signal<string | null>(null);
  cargando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);

  ngOnInit(): void {
    // Se puede llegar desde la ficha de un cliente con el id en la URL, sin
    // tener que volver a buscarlo.
    const id = this.route.snapshot.queryParamMap.get("cliente");
    if (id) {
      this.clientesSrv.getById(id).subscribe({
        next: (c) => this.elegirCliente(c as unknown as Client),
      });
    }
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 4000);
  }

  nombre(c: Client): string {
    return c.isCompany
      ? (c.companyName ?? "")
      : `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  }

  buscar(): void {
    const q = this.busqueda.trim();
    if (q.length < 2) {
      this.resultados.set([]);
      return;
    }
    this.buscando.set(true);
    this.clientesSrv.search(q, 10).subscribe({
      next: (r) => {
        this.resultados.set(r);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false),
    });
  }

  elegirCliente(c: Client): void {
    this.cliente.set(c);
    this.resultados.set([]);
    this.busqueda = "";
    this.ficha.set(null);
    this.cargando.set(true);
    this.srv.vehiculosDelCliente(c.id).subscribe({
      next: (v) => {
        this.vehiculos.set(v);
        this.cargando.set(false);
        // Con un solo vehículo se abre directo: obligar a un clic para ver
        // lo único que hay sobra.
        if (v.length === 1) this.abrirVehiculo(v[0].vehicleId);
      },
      error: () => {
        this.cargando.set(false);
        this.avisar("No se pudieron cargar sus vehículos", "error");
      },
    });
  }

  /**
   * Despliega cómo llegó la unidad en ese servicio.
   *
   * Uno a la vez: son fotos, y con tres visitas abiertas la tabla deja de
   * poder leerse de un vistazo, que es para lo que sirve.
   */
  alternarServicio(id: string): void {
    this.servicioAbierto.update((abierto) => (abierto === id ? null : id));
  }

  abrirVehiculo(vehicleId: string): void {
    this.srv.fichaDelVehiculo(vehicleId).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.servicioAbierto.set(null);
      },
      error: () => this.avisar("No se pudo cargar la ficha", "error"),
    });
  }

  /** Salta al dueño anterior sin tener que buscarlo de nuevo. */
  irACliente(clientId: string): void {
    this.clientesSrv.getById(clientId).subscribe({
      next: (c) => this.elegirCliente(c as unknown as Client),
    });
  }

  limpiar(): void {
    this.cliente.set(null);
    this.vehiculos.set([]);
    this.ficha.set(null);
  }

  etiquetaEstado(e: string): string {
    return (
      {
        RECEIVED: "Recibida",
        DIAGNOSIS: "Diagnóstico",
        IN_PROGRESS: "En proceso",
        WAITING_PARTS: "Espera refacciones",
        READY: "Lista",
        DELIVERED: "Entregada",
        CANCELLED: "Cancelada",
      }[e] ?? e
    );
  }

  // ─── Traspaso ───────────────────────────────────────────────

  traspasoAbierto = signal(false);
  traspaso = { clientId: "", fecha: "", notas: "" };
  candidatos = signal<Client[]>([]);
  busquedaNuevo = "";

  abrirTraspaso(): void {
    this.traspaso = {
      clientId: "",
      fecha: new Date().toISOString().slice(0, 10),
      notas: "",
    };
    this.busquedaNuevo = "";
    this.candidatos.set([]);
    this.traspasoAbierto.set(true);
  }

  buscarNuevoDueno(): void {
    const q = this.busquedaNuevo.trim();
    if (q.length < 2) {
      this.candidatos.set([]);
      return;
    }
    this.clientesSrv.search(q, 8).subscribe({
      next: (r) =>
        // El dueño actual no se ofrece: traspasárselo a sí mismo no es nada.
        this.candidatos.set(
          r.filter((c) => c.id !== this.ficha()?.vehiculo.ownerId),
        ),
    });
  }

  elegirNuevoDueno(c: Client): void {
    this.traspaso.clientId = c.id;
    this.busquedaNuevo = this.nombre(c);
    this.candidatos.set([]);
  }

  confirmarTraspaso(): void {
    const f = this.ficha();
    if (!f || !this.traspaso.clientId) {
      this.avisar("Elige a quién pasa el vehículo", "error");
      return;
    }
    this.srv.traspasar(f.vehiculo.id, this.traspaso).subscribe({
      next: () => {
        this.traspasoAbierto.set(false);
        this.avisar("Vehículo traspasado");
        this.abrirVehiculo(f.vehiculo.id);
        const c = this.cliente();
        if (c) this.elegirCliente(c);
      },
      error: (e) =>
        this.avisar(e?.error?.message || "No se pudo traspasar", "error"),
    });
  }
}
