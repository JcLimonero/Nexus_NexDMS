import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from "@angular/core";
import { APP_BASE_HREF } from "@angular/common";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth.interceptor";
import { BrandingService } from "./core/branding.service";
import { AuthService } from "./core/auth.service";
import { baseHrefDeTenant, slugDeLaUrl } from "./core/tenant-context";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // El cliente en la ruta (`/<slug>/…`) se vuelve la raíz de la app.
    { provide: APP_BASE_HREF, useFactory: baseHrefDeTenant },
    provideAppInitializer(() => {
      const branding = inject(BrandingService);
      branding.aplicarGuardado();
      if (inject(AuthService).isLoggedIn) {
        branding.cargar();
      } else {
        const slug = slugDeLaUrl();
        if (slug) branding.cargarPublicaPorSlug(slug);
      }
    }),
  ],
};
