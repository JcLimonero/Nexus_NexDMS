import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

/** Las cuatro anclas de una paleta; el resto se deriva de ellas. */
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
 * Marca del cliente en el portal de recepción del iPad.
 *
 * ⚠️ Portado de `apps/web/.../shared/services/branding.service.ts`: las apps
 * son proyectos separados y no comparten árbol de código. Un cambio en cómo se
 * traduce la paleta a variables CSS hay que llevarlo a los dos sitios.
 *
 * La marca llega con la sesión (login / `/auth/me`) y aquí se aplica sobre las
 * mismas variables que ya usa el estilo de esta app. Se guarda la última y se
 * aplica al arrancar, para no enseñar un parpadeo con los colores de fábrica.
 */
@Injectable({ providedIn: "root" })
export class BrandingService {
  private http = inject(HttpClient);
  readonly branding = signal<Branding | null>(null);

  aplicarGuardado(): void {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return;
    try {
      this.aplicar(JSON.parse(raw) as Branding);
    } catch {
      /* marca corrupta: se repinta cuando llegue el login */
    }
  }

  cargar(): void {
    this.http.get<{ branding?: Branding }>("/api/v1/auth/me").subscribe({
      next: (me) => me.branding && this.aplicar(me.branding),
      error: () => {},
    });
  }

  establecer(branding: Branding | null | undefined): void {
    if (branding) this.aplicar(branding);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE);
    this.branding.set(null);
  }

  private aplicar(b: Branding): void {
    localStorage.setItem(CLAVE, JSON.stringify(b));
    this.branding.set(b);
    const r = document.documentElement.style;
    const p = b.paleta;
    // Solo los tonos de marca y de acción; neutrales y semánticos se quedan.
    r.setProperty("--nexus-600", p.primary);
    r.setProperty("--nexus-700", p.primaryHover);
    r.setProperty("--primary", p.primary);
    r.setProperty("--primary-hover", p.primaryHover);
    r.setProperty("--primary-soft", p.primarySoft);
    r.setProperty("--navy-600", p.tinta);
  }
}
