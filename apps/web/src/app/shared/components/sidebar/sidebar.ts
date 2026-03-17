import { Component, inject } from "@angular/core";
import { NavigationEnd, Router, RouterModule } from "@angular/router";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";

import { AuthService } from "../../../auth/auth.service";
import { Menu, NavService } from "../../services/nav.service";
import { FeatherIcons } from "../feather-icons/feather-icons";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super administrador",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAREHOUSE: "Almacén",
  CASHIER: "Cajero",
  MECHANIC: "Mecánico",
  SELLER: "Vendedor",
};

@Component({
  selector: "app-sidebar",
  imports: [RouterModule, FeatherIcons, NgbModule, TranslateModule],
  templateUrl: "./sidebar.html",
  styleUrls: ["./sidebar.scss"],
})
export class Sidebar {
  private router = inject(Router);
  private auth = inject(AuthService);
  navServices = inject(NavService);

  public menuItems: Menu[];
  public url: string | ArrayBuffer | null = null;

  get displayName(): string {
    const u = this.auth.getUser();
    if (!u) return "Usuario";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return name || u.email;
  }

  get roleLabel(): string {
    const u = this.auth.getUser();
    if (!u?.roles?.length) return "";
    const role = u.roles[0];
    return ROLE_LABELS[role] ?? role;
  }

  constructor() {
    this.navServices.items.subscribe((menuItems) => {
      this.menuItems = menuItems;
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          menuItems.filter((items) => {
            if (items.path === event.url) this.setNavActive(items);
            if (!items.children) return false;
            items.children.filter((subItems) => {
              if (subItems.path === event.url) this.setNavActive(subItems);
              if (!subItems.children) return false;
              subItems.children.filter((subSubItems) => {
                if (subSubItems.path === event.url)
                  this.setNavActive(subSubItems);
              });
              return;
            });
            return;
          });
        }
      });
    });
  }

  // Active Nave state
  setNavActive(item: Menu) {
    this.menuItems.forEach((menuItem) => {
      if (menuItem !== item) menuItem.active = false;
      if (menuItem.children?.includes(item)) menuItem.active = true;
      menuItem.children?.forEach((submenuItems) => {
        if (submenuItems.children?.includes(item)) {
          menuItem.active = true;
          submenuItems.active = true;
        }
      });
    });
    this.navServices.items.next([...this.menuItems]);
  }

  // Click Toggle menu
  toggleNavActive(item: Menu) {
    if (!item.active) {
      this.menuItems.forEach((a) => {
        if (this.menuItems.includes(item)) a.active = false;
        if (!a.children) return false;
        a.children.forEach((b) => {
          if (a.children?.includes(item)) {
            b.active = false;
          }
        });
        return;
      });
    }
    item.active = !item.active;
  }

  signOut(): void {
    this.auth.logout();
  }

  //Fileupload
  readUrl(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.type.match(/image\/*/)) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.url = reader.result;
    };
  }
}
