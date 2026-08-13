import { Component, DestroyRef, inject } from "@angular/core";
import { ModulesService } from "../../services/modules.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs/operators";
import { NavigationEnd, Router, RouterModule } from "@angular/router";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";

import { AuthService } from "../../../auth/auth.service";
import { Menu, NavService } from "../../services/nav.service";
import { FeatherIcons } from "../feather-icons/feather-icons";
import { SelectorContexto } from "../selector-contexto/selector-contexto";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super administrador",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAREHOUSE: "Almacén",
  CASHIER: "Cajero",
  MECHANIC: "Técnico",
  SELLER: "Vendedor",
};

@Component({
  selector: "app-sidebar",
  imports: [SelectorContexto, RouterModule, FeatherIcons, NgbModule, TranslateModule],
  templateUrl: "./sidebar.html",
  styleUrls: ["./sidebar.scss"],
})
export class Sidebar {
  private router = inject(Router);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  navServices = inject(NavService);

  public menuItems: Menu[];
  public url: string | ArrayBuffer | null = null;
  readonly defaultAvatarUrl = "assets/images/user/default-user.svg";

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

  private modulesService = inject(ModulesService);

  constructor() {
    this.navServices.items
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((menuItems) => {
        this.menuItems = menuItems;
      });

    // Módulos licenciados del tenant (plan + overrides) — filtran el menú
    this.modulesService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mods) =>
          this.navServices.applyEnabledModules(mods.map((m) => m.key)),
        error: () => {}, // ante fallo se deja el menú completo
      });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const menuItems = this.menuItems;
        if (!menuItems) return;
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
