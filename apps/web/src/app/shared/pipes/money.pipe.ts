import { Pipe, PipeTransform, inject } from "@angular/core";
import { BrandingService } from "../services/branding.service";

/**
 * Formatea un monto con la divisa configurada del tenant (BrandingService).
 * Impuro para reflejar el cambio de divisa sin recargar.
 */
@Pipe({ name: "money", standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private branding = inject(BrandingService);

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === "") return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const code = this.branding.branding()?.currency || "MXN";
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: code,
      }).format(n);
    } catch {
      return `${code} ${n.toFixed(2)}`;
    }
  }
}
