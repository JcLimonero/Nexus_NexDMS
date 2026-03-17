import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ContactosService } from "../contactos.service";
import { ClientesService } from "../../clientes.service";
import { ContactDetail } from "../contactos.service";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-contacto-detail",
  standalone: true,
  imports: [CommonModule, RouterModule, FeatherIcons],
  templateUrl: "./contacto-detail.html",
  styleUrls: ["./contacto-detail.scss"],
})
export class ContactoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contactosService = inject(ContactosService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  clientId = signal<string | null>(null);
  clientName = signal<string>("");
  contact = signal<ContactDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get("id");
    const contactId = this.route.snapshot.paramMap.get("contactId");
    if (!clientId || !contactId) {
      this.router.navigate(["/clientes"]);
      return;
    }

    this.clientId.set(clientId);

    this.clientesService.getById(clientId).subscribe({
      next: (c) => this.clientName.set(this.clientesService.getDisplayName(c)),
      error: () => this.clientName.set("Cliente"),
    });

    this.contactosService.getById(clientId, contactId).subscribe({
      next: (c) => {
        this.contact.set(c);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar contacto");
      },
    });
  }

  getDisplayName(c: ContactDetail): string {
    return this.contactosService.getDisplayName(c);
  }

  getQualityBadgeClass(level: string): string {
    const map: Record<string, string> = {
      basic: "bg-secondary",
      partial: "bg-warning text-dark",
      operational: "bg-info",
      complete: "bg-success",
    };
    return map[level] ?? "bg-secondary";
  }

  getQualityLabel(level: string): string {
    const map: Record<string, string> = {
      basic: "Básico",
      partial: "Parcial",
      operational: "Operativo",
      complete: "Completo",
    };
    return map[level] ?? level;
  }

  deleteContact(): void {
    const c = this.contact();
    const id = this.clientId();
    if (!c || !id || !confirm(`¿Eliminar a ${this.getDisplayName(c)}?`)) return;

    this.contactosService.delete(id, c.id).subscribe({
      next: () => {
        this.toastr.success("Contacto eliminado");
        this.router.navigate(["/clientes", id, "contactos"]);
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al eliminar"),
    });
  }
}
