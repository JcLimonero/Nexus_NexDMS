import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

/** Las cuatro anclas que define una paleta; el resto se deriva de ellas. */
export interface Paleta {
  id: string;
  nombre: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  tinta: string;
}

export interface Branding {
  paletaId: string;
  paleta: Paleta;
  logoUrl: string | null;
}

const CLAVE = "nexdms_branding";

/**
 * Aplica la marca del cliente —su paleta y su logotipo— a toda la aplicación.
 *
 * La marca llega con la sesión (`/auth/me`) y aquí se traduce a las variables
 * CSS que ya usa el sistema de diseño. Como se pintan sobre `:root`, alcanzan
 * a cada pantalla y a cada componente sin tocarlos uno por uno: un módulo
 * nuevo hereda la marca por el solo hecho de usar los tokens.
 *
 * Se guarda la última marca conocida y se aplica en el arranque, antes de que
 * vuelva la red: sin eso, cada recarga enseñaría un parpadeo con los colores
 * de fábrica hasta que responde `/auth/me`.
 */
@Injectable({ providedIn: "root" })
export class BrandingService {
  private http = inject(HttpClient);
  readonly branding = signal<Branding | null>(null);

  /** Aplica lo último que se guardó. Se llama al arrancar la aplicación. */
  aplicarGuardado(): void {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return;
    try {
      this.aplicar(JSON.parse(raw) as Branding);
    } catch {
      /* marca corrupta: se ignora y se repinta cuando llegue /auth/me */
    }
  }

  /** Pide la marca al servidor y la aplica. */
  cargar(): void {
    this.http.get<{ branding?: Branding }>("/api/v1/auth/me").subscribe({
      next: (me) => me.branding && this.aplicar(me.branding),
      // Un fallo aquí no debe dejar sin marca: queda la guardada, que es lo
      // que ya se estaba viendo.
      error: () => {},
    });
  }

  /** Recibe la marca ya resuelta —por ejemplo, la del login— y la aplica. */
  establecer(branding: Branding | null | undefined): void {
    if (branding) this.aplicar(branding);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE);
    this.quitarVariables();
    this.branding.set(null);
  }

  private aplicar(b: Branding): void {
    localStorage.setItem(CLAVE, JSON.stringify(b));
    this.branding.set(b);
    this.pintarVariables(b.paleta);
  }

  /**
   * Traduce las cuatro anclas a las variables del sistema de diseño.
   *
   * Se tocan solo los tokens de marca y de acción; los neutrales, los bordes y
   * los colores semánticos (éxito, error) se quedan como están, porque no son
   * de la marca del cliente sino del propio sistema. Los estados derivados
   * —el hover del enlace, el fondo del foco— salen de `color-mix` sobre estas
   * mismas variables, así que basta con fijar las de arriba.
   */
  private pintarVariables(p: Paleta): void {
    const r = document.documentElement.style;
    r.setProperty("--primary", p.primary);
    r.setProperty("--primary-hover", p.primaryHover);
    r.setProperty("--primary-soft", p.primarySoft);
    r.setProperty("--accent", p.primary);
    r.setProperty("--info", p.primary);
    r.setProperty("--info-bg", p.primarySoft);
    // Las anclas de marca que usa el logotipo y las bandas de encabezado.
    r.setProperty("--nexus-600", p.primary);
    r.setProperty("--nexus-700", p.primaryHover);
    r.setProperty("--nexus-50", p.primarySoft);
    r.setProperty("--navy-600", p.tinta);
    // El anillo de foco comparte el tono de acción, ya en rgba translúcido.
    r.setProperty(
      "--focus-ring",
      `0 0 0 3px color-mix(in srgb, ${p.primary} 22%, transparent)`,
    );
  }

  private quitarVariables(): void {
    const r = document.documentElement.style;
    [
      "--primary",
      "--primary-hover",
      "--primary-soft",
      "--accent",
      "--info",
      "--info-bg",
      "--nexus-600",
      "--nexus-700",
      "--nexus-50",
      "--navy-600",
      "--focus-ring",
    ].forEach((v) => r.removeProperty(v));
  }
}
