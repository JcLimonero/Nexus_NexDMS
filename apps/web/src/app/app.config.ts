import {
  provideHttpClient,
  HttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from "@angular/core";
import { APP_BASE_HREF, registerLocaleData } from "@angular/common";
import localeEsMX from "@angular/common/locales/es-MX";
import { provideAnimations } from "@angular/platform-browser/animations";
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
} from "@angular/router";

import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { CalendarModule, DateAdapter } from "angular-calendar";
import { adapterFactory } from "angular-calendar/date-adapters/date-fns";
import { provideCharts, withDefaultRegisterables } from "ng2-charts";
import { provideToastr } from "ngx-toastr";

import { authInterceptor } from "./auth/auth.interceptor";
import { routes } from "./app.routes";
import { NexDMSTitleStrategy } from "./shared/services/nexdms-title.strategy";
import { BrandingService } from "./shared/services/branding.service";
import { AuthService } from "./auth/auth.service";
import { baseHrefDeTenant, slugDeLaUrl } from "./shared/tenant/tenant-context";

/**
 * Español de México en fechas y números.
 *
 * Sin esto Angular usa `en-US` y los `| date` salen "Friday 14 de August":
 * el formato en español pero los nombres en inglés. Se registra una sola vez
 * aquí porque afecta a todas las pantallas.
 */
registerLocaleData(localeEsMX, "es-MX");

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "/assets/i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "es-MX" },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideToastr(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "top",
      }),
    ),
    { provide: TitleStrategy, useClass: NexDMSTitleStrategy },
    // El cliente en la ruta (`/<slug>/…`) se vuelve la raíz de la app: así el
    // slug se mantiene en toda la navegación sin tocar rutas ni routerLinks.
    { provide: APP_BASE_HREF, useFactory: baseHrefDeTenant },
    // La marca del cliente se aplica antes de la primera pantalla: primero la
    // última guardada —instantánea, sin parpadeo de los colores de fábrica— y,
    // si hay sesión, se refresca contra el servidor. Si se entró por la liga de
    // un cliente (`/<slug>/…`) sin sesión, se viste con su marca pública.
    provideAppInitializer(() => {
      const branding = inject(BrandingService);
      branding.aplicarGuardado();
      const auth = inject(AuthService);
      if (auth.isAuthenticated()) {
        branding.cargar();
      } else {
        const slug = slugDeLaUrl();
        if (slug) branding.cargarPublicaPorSlug(slug);
      }
    }),
    importProvidersFrom(
      CalendarModule.forRoot({
        provide: DateAdapter,
        useFactory: adapterFactory,
      }),
      TranslateModule.forRoot({
        defaultLanguage: "es",
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ),
  ],
};
