import { DOCUMENT, SlicePipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { TranslateModule, TranslateService } from "@ngx-translate/core";

import { AuthService } from "../../../auth/auth.service";
import { Menu, NavService } from "../../services/nav.service";
import { FeatherIcons } from "../feather-icons/feather-icons";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [
    FeatherIcons,
    FormsModule,
    RouterModule,
    TranslateModule,
    SlicePipe,
  ],
  providers: [TranslateService],
  templateUrl: "./header.html",
  styleUrls: ["./header.scss"],
})
export class Header implements OnInit, OnDestroy {
  navServices = inject(NavService);
  private auth = inject(AuthService);
  private document = inject(DOCUMENT);
  private translate = inject(TranslateService);

  public menuItems: Menu[] = [];
  public items: Menu[] = [];
  public searchResult = false;
  public searchResultEmpty = false;
  public openNav = false;
  public right_sidebar = false;
  public text = "";
  public elem: HTMLElement;
  public isOpenMobile = false;

  readonly rightSidebarEvent = output<boolean>();

  ngOnInit(): void {
    this.elem = this.document.documentElement;
    this.navServices.items.subscribe((menuItems) => {
      this.items = menuItems;
    });
  }

  ngOnDestroy(): void {
    this.removeFix();
  }

  right_side_bar(): void {
    this.right_sidebar = !this.right_sidebar;
    this.rightSidebarEvent.emit(this.right_sidebar);
  }

  collapseSidebar(): void {
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
  }

  openMobileNav(): void {
    this.openNav = !this.openNav;
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
  }

  searchTerm(term: string): void {
    term ? this.addFix() : this.removeFix();
    if (!term) {
      this.menuItems = [];
      return;
    }

    const searchTerm = term.toLowerCase();
    const results: Menu[] = [];

    this.items.forEach((menuItem) => {
      if (
        menuItem.title?.toLowerCase().includes(searchTerm) &&
        menuItem.type === "link"
      ) {
        results.push(menuItem);
      }

      menuItem.children?.forEach((subItem) => {
        if (
          subItem.title?.toLowerCase().includes(searchTerm) &&
          subItem.type === "link"
        ) {
          subItem.icon = menuItem.icon;
          results.push(subItem);
        }

        subItem.children?.forEach((suSubItem) => {
          if (suSubItem.title?.toLowerCase().includes(searchTerm)) {
            suSubItem.icon = menuItem.icon;
            results.push(suSubItem);
          }
        });
      });
    });

    this.checkSearchResultEmpty(results);
    this.menuItems = results;
  }

  checkSearchResultEmpty(items: Menu[]): void {
    this.searchResultEmpty = items.length === 0;
  }

  addFix(): void {
    this.searchResult = true;
    this.document.body.classList.add("offcanvas");
  }

  removeFix(): void {
    this.searchResult = false;
    this.document.body.classList.remove("offcanvas");
    this.text = "";
  }

  SignOut(): void {
    this.auth.logout();
  }

  toggleFullScreen(): void {
    this.navServices.fullScreen = !this.navServices.fullScreen;

    if (this.navServices.fullScreen) {
      if (this.elem.requestFullscreen) {
        this.elem.requestFullscreen();
      } else if (
        (
          this.elem as HTMLElement & {
            mozRequestFullScreen: () => Promise<void>;
          }
        ).mozRequestFullScreen
      ) {
        (
          this.elem as HTMLElement & {
            mozRequestFullScreen: () => Promise<void>;
          }
        ).mozRequestFullScreen();
      } else if (
        (
          this.elem as HTMLElement & {
            webkitRequestFullscreen: () => Promise<void>;
          }
        ).webkitRequestFullscreen
      ) {
        (
          this.elem as HTMLElement & {
            webkitRequestFullscreen: () => Promise<void>;
          }
        ).webkitRequestFullscreen();
      } else if (
        (
          this.elem as HTMLElement & {
            msRequestFullscreen: () => Promise<void>;
          }
        ).msRequestFullscreen
      ) {
        (
          this.elem as HTMLElement & {
            msRequestFullscreen: () => Promise<void>;
          }
        ).msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (
        (
          this.document as Document & {
            mozCancelFullScreen: () => Promise<void>;
          }
        ).mozCancelFullScreen
      ) {
        (
          this.document as Document & {
            mozCancelFullScreen: () => Promise<void>;
          }
        ).mozCancelFullScreen();
      } else if (
        (
          this.document as Document & {
            webkitExitFullscreen: () => Promise<void>;
          }
        ).webkitExitFullscreen
      ) {
        (
          this.document as Document & {
            webkitExitFullscreen: () => Promise<void>;
          }
        ).webkitExitFullscreen();
      } else if (
        (this.document as Document & { msExitFullscreen: () => Promise<void> })
          .msExitFullscreen
      ) {
        (
          this.document as Document & { msExitFullscreen: () => Promise<void> }
        ).msExitFullscreen();
      }
    }
  }
}
