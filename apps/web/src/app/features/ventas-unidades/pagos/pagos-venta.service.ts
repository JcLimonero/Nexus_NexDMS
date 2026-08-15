import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/unit-sales";

export type TipoPago = "APARTADO" | "ENGANCHE" | "PARCIAL" | "LIQUIDACION";
export type FormaPago = "CASH" | "TRANSFER" | "CARD" | "CHECK" | "OTHER";

export interface PagoVenta {
  id: string;
  kind: TipoPago;
  amount: number;
  method: FormaPago;
  reference: string | null;
  paidDate: string;
  notes: string | null;
  tieneComprobante: boolean;
}

export interface PagosResumen {
  pagos: PagoVenta[];
  total: number;
  pagosSinComprobante: number;
}

export interface RegistrarPago {
  kind: TipoPago;
  amount: number;
  method: FormaPago;
  reference?: string;
  paidDate: string;
  notes?: string;
}

/** Pagos de una venta de unidad y sus comprobantes. */
@Injectable({ providedIn: "root" })
export class PagosVentaService {
  private http = inject(HttpClient);

  listar(unitSaleId: string): Observable<PagosResumen> {
    return this.http.get<PagosResumen>(`${URL}/${unitSaleId}/payments`);
  }

  registrar(unitSaleId: string, dto: RegistrarPago): Observable<PagoVenta> {
    return this.http.post<PagoVenta>(`${URL}/${unitSaleId}/payments`, dto);
  }

  subirComprobante(pagoId: string, file: File): Observable<unknown> {
    const form = new FormData();
    form.append("file", file);
    return this.http.post(`${URL}/payments/${pagoId}/receipt`, form);
  }

  ligaComprobante(pagoId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${URL}/payments/${pagoId}/receipt-url`,
    );
  }

  eliminar(pagoId: string): Observable<unknown> {
    return this.http.delete(`${URL}/payments/${pagoId}`);
  }
}

export const TIPO_PAGO: { value: TipoPago; label: string }[] = [
  { value: "APARTADO", label: "Apartado" },
  { value: "ENGANCHE", label: "Enganche" },
  { value: "PARCIAL", label: "Pago parcial" },
  { value: "LIQUIDACION", label: "Liquidación" },
];

export const FORMA_PAGO: { value: FormaPago; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD", label: "Tarjeta" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" },
];

export const ETIQUETA_TIPO: Record<string, string> = Object.fromEntries(
  TIPO_PAGO.map((t) => [t.value, t.label]),
);
export const ETIQUETA_FORMA: Record<string, string> = Object.fromEntries(
  FORMA_PAGO.map((f) => [f.value, f.label]),
);
