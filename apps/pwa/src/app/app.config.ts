import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth.interceptor";
import { BrandingService } from "./core/branding.service";
import { AuthService } from "./core/auth.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => {
      const branding = inject(BrandingService);
      branding.aplicarGuardado();
      if (inject(AuthService).isLoggedIn) branding.cargar();
    }),
  ],
};
