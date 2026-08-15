import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
} from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeEsMx from "@angular/common/locales/es-MX";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth.interceptor";
import { BrandingService } from "./core/branding.service";
import { AuthService } from "./core/auth.service";

// Sin registrar el idioma, `date` cae al inglés por defecto y la cabecera
// mostraba "Thursday 13 De August" a un asesor que trabaja en español.
registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "es-MX" },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // La marca del cliente antes de la primera pantalla: la guardada, y si hay
    // sesión se refresca contra el servidor.
    provideAppInitializer(() => {
      const branding = inject(BrandingService);
      branding.aplicarGuardado();
      if (inject(AuthService).isLoggedIn) branding.cargar();
    }),
  ],
};
