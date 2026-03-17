import { Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  PRIMARY_OUTLET,
  Router,
  RouterModule,
} from "@angular/router";

import { map } from "rxjs";
import { filter } from "rxjs/operators";

import { Bookmark } from "../bookmark/bookmark";
import { FeatherIcons } from "../feather-icons/feather-icons";

interface Breadcrumbs {
  parentBreadcrumb: string | null;
  childBreadcrumb: string | null;
}

@Component({
  selector: "app-breadcrumb",
  standalone: true,
  imports: [RouterModule, FeatherIcons, Bookmark],
  templateUrl: "./breadcrumb.html",
  styleUrls: ["./breadcrumb.scss"],
})
export class Breadcrumb {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  public breadcrumbs: Breadcrumbs = {
    parentBreadcrumb: null,
    childBreadcrumb: null,
  };

  public title: string = "";

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter((route) => route.outlet === PRIMARY_OUTLET),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((route) => {
        const snapshot: ActivatedRouteSnapshot = route.snapshot;

        const title = snapshot.data["title"] ?? "";
        const parent = snapshot.parent?.data["breadcrumb"] ?? null;
        const child = snapshot.data["breadcrumb"] ?? null;

        this.title = title;
        this.breadcrumbs = {
          parentBreadcrumb: parent,
          childBreadcrumb: child,
        };
      });
  }
}
