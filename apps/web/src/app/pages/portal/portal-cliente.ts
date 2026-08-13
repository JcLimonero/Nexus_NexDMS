import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  PortalCita,
  PortalClienteService,
  PortalDocumento,
  PortalEncuesta,
  PortalInicio,
  PortalMensaje,
  PortalOrden,
  PortalVehiculo,
} from "./portal-cliente.service";

type Vista = "inicio" | "vehiculos" | "orden" | "citas" | "documentos";

/**
 * Portal del cliente.
 *
 * Una sola pantalla con vistas internas en vez de rutas: el cliente entra
 * desde un enlace de WhatsApp, mira dos cosas y se va. Meter navegación por
 * URL aquí solo añadiría estados que nadie va a compartir.
 */
@Component({
  selector: "app-portal-cliente",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./portal-cliente.html",
  styleUrls: ["./portal-cliente.scss"],
})
export class PortalCliente implements OnInit {
  readonly srv = inject(PortalClienteService);

  // ── Acceso ──
  paso = signal<"telefono" | "codigo">("telefono");
  telefono = "";
  codigo = "";
  enviando = signal(false);
  error = signal<string | null>(null);

  // ── Contenido ──
  vista = signal<Vista>("inicio");
  cargando = signal(false);
  inicio = signal<PortalInicio | null>(null);
  vehiculos = signal<PortalVehiculo[]>([]);
  orden = signal<PortalOrden | null>(null);
  citas = signal<PortalCita[]>([]);
  documentos = signal<PortalDocumento[]>([]);
  encuestas = signal<PortalEncuesta[]>([]);

  // ── Conversación ──
  mensajes = signal<PortalMensaje[]>([]);
  nuevoMensaje = "";
  chatAbierto = signal(false);

  ngOnInit(): void {
    if (this.srv.token()) this.cargarInicio();
  }

  // ─── Acceso ─────────────────────────────────────────────────

  pedirCodigo(): void {
    const tel = this.telefono.replace(/\D/g, "");
    if (tel.length < 10) {
      this.error.set("Escribe tu teléfono a 10 dígitos");
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.srv.solicitarCodigo(this.telefono).subscribe({
      next: () => {
        this.enviando.set(false);
        this.paso.set("codigo");
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(e?.error?.message || "No se pudo enviar el código");
      },
    });
  }

  entrar(): void {
    if (this.codigo.trim().length !== 6) {
      this.error.set("El código son 6 dígitos");
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.srv.verificar(this.telefono, this.codigo.trim()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.codigo = "";
        this.cargarInicio();
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(e?.error?.message || "Código no válido");
      },
    });
  }

  salir(): void {
    this.srv.salir();
    this.paso.set("telefono");
    this.vista.set("inicio");
    this.inicio.set(null);
  }

  // ─── Datos ──────────────────────────────────────────────────

  private cargarInicio(): void {
    this.cargando.set(true);
    this.srv.inicio().subscribe({
      next: (i) => {
        this.inicio.set(i);
        this.cargando.set(false);
        this.vista.set("inicio");
      },
      error: () => {
        // El token venció o ya no vale: se pide acceso otra vez.
        this.cargando.set(false);
        this.salir();
      },
    });
  }

  ir(v: Vista): void {
    this.vista.set(v);
    this.error.set(null);
    if (v === "vehiculos" && !this.vehiculos().length) {
      this.cargando.set(true);
      this.srv.vehiculos().subscribe({
        next: (x) => {
          this.vehiculos.set(x);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
    }
    if (v === "citas" && !this.citas().length) {
      this.srv.citas().subscribe({ next: (x) => this.citas.set(x) });
    }
    if (v === "documentos" && !this.documentos().length) {
      this.srv.documentos().subscribe({ next: (x) => this.documentos.set(x) });
      this.srv.encuestas().subscribe({ next: (x) => this.encuestas.set(x) });
    }
  }

  verOrden(v: PortalVehiculo): void {
    if (!v.ordenActual) return;
    this.cargando.set(true);
    this.srv.orden(v.ordenActual.id).subscribe({
      next: (o) => {
        this.orden.set(o);
        this.cargando.set(false);
        this.vista.set("orden");
        this.chatAbierto.set(false);
        this.cargarMensajes();
      },
      error: () => this.cargando.set(false),
    });
  }

  // ─── Conversación ───────────────────────────────────────────

  private cargarMensajes(): void {
    const o = this.orden();
    if (!o) return;
    this.srv.mensajes(o.id).subscribe({ next: (m) => this.mensajes.set(m) });
  }

  alternarChat(): void {
    this.chatAbierto.update((v) => !v);
    if (this.chatAbierto()) this.cargarMensajes();
  }

  enviarMensaje(): void {
    const o = this.orden();
    const texto = this.nuevoMensaje.trim();
    if (!o || !texto) return;
    this.enviando.set(true);
    this.srv.escribir(o.id, texto).subscribe({
      next: () => {
        this.enviando.set(false);
        this.nuevoMensaje = "";
        this.cargarMensajes();
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(e?.error?.message || "No se pudo enviar");
      },
    });
  }

  // ─── Ayudas de presentación ─────────────────────────────────

  vehiculoTexto(v: PortalVehiculo): string {
    return [v.marca, v.modelo, v.anio].filter(Boolean).join(" ");
  }

  etiquetaDocumento(kind: string): string {
    const m: Record<string, string> = {
      CLIENT_QUOTE: "Autorización del presupuesto",
      CLIENT_CONFORME: "Conformidad de recepción",
      ADVISOR: "Firma del asesor",
    };
    return m[kind] ?? kind;
  }

  enlaceFirma(d: PortalDocumento): string {
    return `/f/${d.token}`;
  }

  enlaceEncuesta(e: PortalEncuesta): string {
    return `/s/${e.token}`;
  }
}
