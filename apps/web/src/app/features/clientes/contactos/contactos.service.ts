import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { Contact } from "../models/client.model";

export interface ContactDetail extends Contact {
  dataQuality?: { score: number; level: string; missingFields: string[] };
}

export interface CreateContactDto {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  position?: string;
  department?: string;
  isAuthorized?: boolean;
  notes?: string;
}

function apiUrl(clientId: string): string {
  return `/api/v1/clients/${clientId}/contacts`;
}

@Injectable({
  providedIn: "root",
})
export class ContactosService {
  private http = inject(HttpClient);

  getAllByClient(clientId: string): Observable<Contact[]> {
    return this.http.get<Contact[]>(apiUrl(clientId));
  }

  getById(clientId: string, contactId: string): Observable<ContactDetail> {
    return this.http.get<ContactDetail>(`${apiUrl(clientId)}/${contactId}`);
  }

  create(clientId: string, dto: CreateContactDto): Observable<Contact> {
    return this.http.post<Contact>(apiUrl(clientId), dto);
  }

  update(
    clientId: string,
    contactId: string,
    dto: Partial<CreateContactDto>
  ): Observable<Contact> {
    return this.http.patch<Contact>(
      `${apiUrl(clientId)}/${contactId}`,
      dto
    );
  }

  delete(clientId: string, contactId: string): Observable<void> {
    return this.http
      .delete<{ deleted: boolean }>(`${apiUrl(clientId)}/${contactId}`)
      .pipe(map(() => undefined));
  }

  getDisplayName(contact: Contact): string {
    const parts = [contact.firstName, contact.lastName].filter(Boolean);
    return parts.join(" ") || contact.phone;
  }
}
