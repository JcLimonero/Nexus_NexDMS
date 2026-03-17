import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { ContactosService } from "../contactos.service";
import { ClientesService } from "../../clientes.service";
import { Contact } from "../../models/client.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-contactos-list",
  standalone: true,
  imports: [CommonModule, RouterModule, FeatherIcons],
  templateUrl: "./contactos-list.html",
  styleUrls: ["./contactos-list.scss"],
})
export class ContactosList implements OnInit {
  private route = inject(ActivatedRoute);
  private contactosService = inject(ContactosService);
  private clientesService = inject(ClientesService);

  clientId = signal<string | null>(null);
  clientName = signal<string>("");
  contacts = signal<Contact[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) return;

    this.clientId.set(id);

    this.clientesService.getById(id).subscribe({
      next: (c) => this.clientName.set(this.clientesService.getDisplayName(c)),
      error: () => this.clientName.set("Cliente"),
    });

    this.contactosService.getAllByClient(id).subscribe({
      next: (list) => {
        this.contacts.set(list);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar contactos");
      },
    });
  }

  load(): void {
    const id = this.clientId();
    if (!id) return;
    this.loading.set(true);
    this.contactosService.getAllByClient(id).subscribe({
      next: (list) => {
        this.contacts.set(list);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar contactos");
      },
    });
  }

  getDisplayName(contact: Contact): string {
    return this.contactosService.getDisplayName(contact);
  }

  deleteContact(contact: Contact, event: Event): void {
    event.preventDefault();
    const id = this.clientId();
    if (!id || !confirm(`¿Eliminar a ${this.getDisplayName(contact)}?`)) return;

    this.contactosService.delete(id, contact.id).subscribe({
      next: () => this.load(),
      error: (err) =>
        alert(err?.error?.message || "Error al eliminar el contacto"),
    });
  }
}
