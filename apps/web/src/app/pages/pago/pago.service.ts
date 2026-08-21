import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { EstadoCobro } from "../../shared/services/billing-state.service";

export interface CheckoutResp {
  /** URL de la pasarela a la que se manda al cliente a pagar. */
  url: string;
  /** Referencia del checkout creado, para conciliar. */
  referencia?: string;
}

@Injectable({ providedIn: "root" })
export class PagoService {
  private http = inject(HttpClient);

  estado(): Observable<EstadoCobro> {
    return this.http.get<EstadoCobro>("/api/v1/mi-cobro/estado");
  }

  /** Crea el cobro en la pasarela y devuelve a dónde mandar al cliente. */
  checkout(): Observable<CheckoutResp> {
    return this.http.post<CheckoutResp>("/api/v1/mi-cobro/checkout", {});
  }
}
