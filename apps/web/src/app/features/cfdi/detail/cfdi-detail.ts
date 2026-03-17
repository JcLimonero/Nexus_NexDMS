import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CfdiService } from "../cfdi.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import {
  CfdiDetail as CfdiDetailModel,
  CfdiStatus,
  CancelCfdiDto,
  RegisterPagoDto,
} from "../models/cfdi-log.model";

@Component({
  selector: "app-cfdi-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./cfdi-detail.html",
  styleUrls: ["./cfdi-detail.scss"],
})
export class CfdiDetail implements OnInit {
  private cfdiService = inject(CfdiService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  cfdi = signal<CfdiDetailModel | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  cancelling = signal(false);
  resending = signal(false);
  registeringPago = signal(false);
  cancelMotivo = signal<"01" | "02" | "03" | "04">("03");
  cancelSustitucionId = signal("");
  pagoAmount = signal(0);
  pagoDate = signal("");
  pagoMethod = signal("PUE");
  pagoReference = signal("");

  readonly motivosCancelacion = [
    { value: "01", label: "01 - Comprobante emitido con errores con relación" },
    { value: "02", label: "02 - Comprobante emitido con errores sin relación" },
    { value: "03", label: "03 - No se llevó a cabo la operación" },
    { value: "04", label: "04 - Operación nominativa relacionada en factura global" },
  ] as const;

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/cfdi"]);
      return;
    }

    this.cfdiService.getCfdi(id).subscribe({
      next: (c) => {
        this.cfdi.set(c);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar CFDI");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getTypeLabel(type: string): string {
    return this.cfdiService.getTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.cfdiService.getStatusLabel(status);
  }

  getReferenceTypeLabel(type: string): string {
    return this.cfdiService.getReferenceTypeLabel(type);
  }

  canCancel(): boolean {
    const c = this.cfdi();
    return !!c && c.status === CfdiStatus.VALID;
  }

  canResend(): boolean {
    const c = this.cfdi();
    return !!c && c.status === CfdiStatus.VALID;
  }

  canRegisterPago(): boolean {
    const c = this.cfdi();
    return !!c && c.status === CfdiStatus.VALID && c.cfdiType === "INCOME";
  }

  openXml(): void {
    const c = this.cfdi();
    if (c?.xmlUrl) window.open(c.xmlUrl, "_blank");
  }

  openPdf(): void {
    const c = this.cfdi();
    if (c?.pdfUrl) window.open(c.pdfUrl, "_blank");
  }

  onCancel(): void {
    const c = this.cfdi();
    if (!c || this.cancelling()) return;
    if (!confirm("¿Cancelar este CFDI ante el SAT? Esta acción no se puede deshacer.")) return;

    const dto: CancelCfdiDto = {
      motivoCancelacion: this.cancelMotivo(),
      cfdiSustitucionId: this.cancelSustitucionId().trim() || undefined,
    };

    this.cancelling.set(true);
    this.cfdiService.cancelCfdi(c.id, dto).subscribe({
      next: (updated) => {
        this.cfdi.update((prev) => (prev ? { ...prev, ...updated } : null));
        this.toastr.success("CFDI cancelado");
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cancelar");
        this.cancelling.set(false);
      },
    });
  }

  onResend(): void {
    const c = this.cfdi();
    if (!c || this.resending()) return;

    this.resending.set(true);
    this.cfdiService.resendCfdi(c.id).subscribe({
      next: () => {
        this.toastr.success("CFDI reenviado al cliente");
        this.resending.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al reenviar");
        this.resending.set(false);
      },
    });
  }

  onRegisterPago(): void {
    const c = this.cfdi();
    if (!c || this.registeringPago()) return;

    const amount = this.pagoAmount();
    const date = this.pagoDate();
    const method = this.pagoMethod();

    if (amount <= 0 || !date || !method) {
      this.toastr.warning("Complete monto, fecha y método de pago");
      return;
    }

    const dto: RegisterPagoDto = {
      amount,
      paymentDate: date,
      paymentMethod: method,
      paymentReference: this.pagoReference().trim() || undefined,
    };

    this.registeringPago.set(true);
    this.cfdiService.registerPago(c.id, dto).subscribe({
      next: () => {
        this.toastr.success("Pago registrado");
        this.pagoAmount.set(0);
        this.pagoDate.set("");
        this.pagoReference.set("");
        this.registeringPago.set(false);
        this.cfdiService.getCfdi(c.id).subscribe({
          next: (updated) => this.cfdi.set(updated),
        });
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al registrar pago");
        this.registeringPago.set(false);
      },
    });
  }
}
