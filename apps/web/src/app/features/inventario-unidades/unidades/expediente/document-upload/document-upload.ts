import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  UnitReturnDocumentType,
  UNIT_RETURN_DOCUMENT_TYPES,
  UNIT_RETURN_DOCUMENT_TYPE_LABELS,
} from "../../../models/unit-return-document.model";

@Component({
  selector: "app-document-upload",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./document-upload.html",
  styleUrls: ["./document-upload.scss"],
})
export class DocumentUpload {
  @Input() disabled = false;
  @Output() upload = new EventEmitter<{
    documentType: UnitReturnDocumentType;
    file: File;
  }>();

  documentTypes = UNIT_RETURN_DOCUMENT_TYPES;
  typeLabels = UNIT_RETURN_DOCUMENT_TYPE_LABELS;

  selectedType = signal<UnitReturnDocumentType | "">("");

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.disabled) return;

    const type = this.selectedType();
    if (!type) return;

    this.upload.emit({ documentType: type, file });
    input.value = "";
  }

  triggerFileInput(): void {
    const type = this.selectedType();
    if (!type || this.disabled) return;
    document.getElementById("doc-file-input")?.click();
  }
}
