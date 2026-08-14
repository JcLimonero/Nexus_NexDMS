import {
  provideHttpClient,
  HttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
  provideZoneChangeDetection,
} from "@angular/core";
import { registerLocaleData } from "@angular/common";
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
