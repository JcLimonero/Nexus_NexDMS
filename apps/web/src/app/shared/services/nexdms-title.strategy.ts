import { Injectable, effect, inject } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterStateSnapshot, TitleStrategy } from "@angular/router";
import { BrandingService } from "./branding.service";

const APP_TITLE = "NexDMS";

/**
 * Pone en la pestaña el cliente y la pantalla: "AutoPlaza · NexDMS - Inicio".
 *
 * El nombre del cliente va al frente porque es lo que queda visible cuando la
 * pestaña se angosta, y es justo lo que distingue una sesión de otra cuando el
 * superadmin abre varios clientes a la vez.
 *
 * El decorador no es opcional: al heredar de `TitleStrategy`, que sí es
 * inyectable, la clase heredaba su metadata y `useClass` resolvía por la
 * fábrica del padre. El resultado era que este `updateTitle` no llegaba a
 * ejecutarse nunca y todas las pestañas del DMS decían solo "NexDMS".
 */
@Injectable({ providedIn: "root" })
export class NexDMSTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private brandingSrv = inject(BrandingService);
  private ultimaPantalla: string | undefined;

  constructor() {
    super();
    // La marca puede llegar después de la navegación inicial (p. ej. al entrar
    // por SSO): cuando cambia, se vuelve a rotular con el cliente ya conocido.
    effect(() => {
      this.brandingSrv.branding();
      this.pintar();
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.ultimaPantalla =
      this.buildTitle(snapshot) ?? this.getTitleFromData(snapshot);
    this.pintar();
  }

  private pintar(): void {
    const cliente = this.brandingSrv.branding()?.nombre;
    const base = this.ultimaPantalla
      ? `${APP_TITLE} - ${this.ultimaPantalla}`
      : APP_TITLE;
    this.title.setTitle(cliente ? `${cliente} · ${base}` : base);
  }

  private getTitleFromData(snapshot: RouterStateSnapshot): string | undefined {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data["title"] as string | undefined;
  }
}
