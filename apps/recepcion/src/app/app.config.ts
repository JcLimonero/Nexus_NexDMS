import { ApplicationConfig, LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localeEsMx from "@angular/common/locales/es-MX";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth.interceptor";

// Sin registrar el idioma, `date` cae al inglés por defecto y la cabecera
// mostraba "Thursday 13 De August" a un asesor que trabaja en español.
registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "es-MX" },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
