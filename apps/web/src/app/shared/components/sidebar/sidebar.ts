import { Component, inject } from "@angular/core";
import { NavigationEnd, Router, RouterModule } from "@angular/router";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";

import { Menu, NavService } from "../../services/nav.service";
import { FeatherIcons } from "../feather-icons/feather-icons";

@Component({
  selector: "app-sidebar",
  imports: [RouterModule, FeatherIcons, NgbModule, TranslateModule],
  templateUrl: "./sidebar.html",
  styleUrls: ["./sidebar.scss"],
})
export class Sidebar {
  private router = inject(Router);
  navServices = inject(NavService);

  public menuItems: Menu[];
  public url: string | ArrayBuffer | null = null;

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
    this.menuItems.filter((menuItem) => {
      if (menuItem != item) menuItem.active = false;
      if (menuItem.children && menuItem.children.includes(item))
        menuItem.active = true;
      if (menuItem.children) {
        menuItem.children.filter((submenuItems) => {
          if (submenuItems.children && submenuItems.children.includes(item)) {
            menuItem.active = true;
            submenuItems.active = true;
          }
        });
      }
    });
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
