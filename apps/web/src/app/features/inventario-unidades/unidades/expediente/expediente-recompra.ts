import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { UnitReturnDocumentsService } from "../../unit-return-documents.service";
import { DocumentUpload } from "./document-upload/document-upload";
import {
  CatalogUnit,
  UnitHistoryEvent,
} from "../../models/catalog-unit.model";
import {
  UnitReturnDocument,
  UNIT_RETURN_DOCUMENT_TYPE_LABELS,
  UnitReturnDocumentType,
} from "../../models/unit-return-document.model";

@Component({
  selector: "app-expediente-recompra",
  standalone: true,
  imports: [CommonModule, RouterModule, DocumentUpload],
  templateUrl: "./expediente-recompra.html",
  styleUrls: ["./expediente-recompra.scss"],
})
export class ExpedienteRecompra implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioUnidadesService);
  private docsService = inject(UnitReturnDocumentsService);
  private toastr = inject(ToastrService);

  unidad = signal<CatalogUnit | null>(null);
  returnEvent = signal<UnitHistoryEvent | null>(null);
  documents = signal<UnitReturnDocument[]>([]);
  loading = signal(true);
  uploading = signal(false);
  error = signal<string | null>(null);

  typeLabels = UNIT_RETURN_DOCUMENT_TYPE_LABELS;

  unitId = computed(() => this.route.snapshot.paramMap.get("id") ?? "");
  returnId = computed(() => this.route.snapshot.paramMap.get("returnId") ?? "");

  ngOnInit(): void {
    const id = this.unitId();
    const returnId = this.returnId();
    if (!id || !returnId) {
      this.router.navigate(["/inventario-unidades"]);
      return;
    }

    this.inventarioService.getUnit(id).subscribe({
      next: (u) => {
        this.unidad.set(u);
        this.loadReturnEvent(id, returnId);
        this.loadDocuments(returnId);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar unidad");
      },
    });
  }

  private loadReturnEvent(unitId: string, returnId: string): void {
    this.inventarioService.getUnitHistory(unitId).subscribe({
      next: (events) => {
        const ev = events.find((e) => e.type === "RETURN" && e.id === returnId);
        this.returnEvent.set(ev ?? null);
      },
    });
  }

  private loadDocuments(returnId: string): void {
    this.docsService.getUnitReturnDocuments(returnId).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar documentos");
      },
    });
  }

  onUpload(event: { documentType: UnitReturnDocumentType; file: File }): void {
    const returnId = this.returnId();
    if (!returnId) return;

    this.uploading.set(true);
    this.docsService
      .uploadUnitReturnDocument(returnId, event.documentType, event.file)
      .subscribe({
        next: (doc) => {
          this.documents.update((d) => [doc, ...d]);
          this.toastr.success("Documento subido correctamente");
          this.uploading.set(false);
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || "Error al subir el documento"
          );
          this.uploading.set(false);
        },
      });
  }

  onDownload(doc: UnitReturnDocument): void {
    const returnId = this.returnId();
    if (!returnId) return;

    this.docsService
      .getUnitReturnDocumentDownloadUrl(returnId, doc.id)
      .subscribe({
        next: (url) => {
          window.open(url, "_blank");
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || "Error al obtener el documento"
          );
        },
      });
  }

  onDelete(doc: UnitReturnDocument): void {
    const returnId = this.returnId();
    if (!returnId) return;
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;

    this.docsService.deleteUnitReturnDocument(returnId, doc.id).subscribe({
      next: () => {
        this.documents.update((d) => d.filter((x) => x.id !== doc.id));
        this.toastr.success("Documento eliminado");
      },
      error: (err) => {
        this.toastr.error(
          err?.error?.message || "Error al eliminar el documento"
        );
      },
    });
  }

  onApprove(doc: UnitReturnDocument): void {
    const returnId = this.returnId();
    if (!returnId) return;

    this.docsService.approveUnitReturnDocument(returnId, doc.id).subscribe({
      next: (updated) => {
        this.documents.update((d) =>
          d.map((x) => (x.id === doc.id ? updated : x))
        );
        this.toastr.success("Documento aprobado");
      },
      error: (err) => {
        this.toastr.error(
          err?.error?.message || "Error al aprobar el documento"
        );
      },
    });
  }

  onReject(doc: UnitReturnDocument): void {
    const returnId = this.returnId();
    if (!returnId) return;

    const reason = prompt("Motivo del rechazo:");
    if (!reason?.trim()) return;

    this.docsService
      .rejectUnitReturnDocument(returnId, doc.id, reason.trim())
      .subscribe({
        next: (updated) => {
          this.documents.update((d) =>
            d.map((x) => (x.id === doc.id ? updated : x))
          );
          this.toastr.success("Documento rechazado");
        },
        error: (err) => {
          this.toastr.error(
            err?.error?.message || "Error al rechazar el documento"
          );
        },
      });
  }

  getDisplayLabel(u: CatalogUnit): string {
    const v = u.version ? ` ${u.version}` : "";
    return `${u.brand} ${u.model}${v} (${u.year}) - ${u.color}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getDocumentTypeLabel(doc: UnitReturnDocument): string {
    return this.typeLabels[doc.documentType] || doc.documentType;
  }
}
