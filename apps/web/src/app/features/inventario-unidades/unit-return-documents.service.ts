import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  UnitReturnDocument,
  UnitReturnDocumentType,
} from "./models/unit-return-document.model";

const BASE = "/api/v1/unit-returns";

@Injectable({
  providedIn: "root",
})
export class UnitReturnDocumentsService {
  private http = inject(HttpClient);

  getUnitReturnDocuments(unitReturnId: string): Observable<UnitReturnDocument[]> {
    return this.http.get<UnitReturnDocument[]>(
      `${BASE}/${unitReturnId}/documents`
    );
  }

  uploadUnitReturnDocument(
    unitReturnId: string,
    documentType: UnitReturnDocumentType,
    file: File
  ): Observable<UnitReturnDocument> {
    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("file", file);
    return this.http.post<UnitReturnDocument>(
      `${BASE}/${unitReturnId}/documents/upload`,
      formData
    );
  }

  getUnitReturnDocumentDownloadUrl(
    unitReturnId: string,
    documentId: string
  ): Observable<string> {
    return this.http.get<string>(
      `${BASE}/${unitReturnId}/documents/${documentId}/download-url`
    );
  }

  deleteUnitReturnDocument(
    unitReturnId: string,
    documentId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${BASE}/${unitReturnId}/documents/${documentId}`
    );
  }

  approveUnitReturnDocument(
    unitReturnId: string,
    documentId: string
  ): Observable<UnitReturnDocument> {
    return this.http.post<UnitReturnDocument>(
      `${BASE}/${unitReturnId}/documents/${documentId}/approve`,
      {}
    );
  }

  rejectUnitReturnDocument(
    unitReturnId: string,
    documentId: string,
    rejectionReason: string
  ): Observable<UnitReturnDocument> {
    return this.http.post<UnitReturnDocument>(
      `${BASE}/${unitReturnId}/documents/${documentId}/reject`,
      { rejectionReason }
    );
  }
}
