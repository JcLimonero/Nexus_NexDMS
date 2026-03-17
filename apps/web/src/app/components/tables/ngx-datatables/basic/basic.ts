import { DecimalPipe, AsyncPipe } from "@angular/common";
import { Component, inject, viewChildren } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { Observable } from "rxjs";

import { COMPANYDB } from "../../../../shared/data/tables/company";
import { serverDB } from "../../../../shared/data/tables/server";
import {
  NgbdSortableHeaderDirective,
  SortEvent,
} from "../../../../shared/directives/NgbdSortableHeader";
import { TableService } from "../../../../shared/services/table.service";

@Component({
  selector: "app-basic",
  imports: [NgbModule, NgbdSortableHeaderDirective, AsyncPipe],
  providers: [TableService, DecimalPipe],
  templateUrl: "./basic.html",
  styleUrls: ["./basic.scss"],
})
export class BasicNgxDatatable {
  service = inject(TableService);

  public selected = [];

  public tableItem$: Observable<serverDB[]>;
  public searchText: string = "";
  total$: Observable<number>;

  constructor() {
    const service = this.service;

    this.tableItem$ = service.tableItem$;
    this.total$ = service.total$;
    this.service.setUserData(COMPANYDB);
  }

  readonly headers = viewChildren(NgbdSortableHeaderDirective);

  onSort({ column, direction }: SortEvent) {
    // resetting other headers
    this.headers().forEach((header) => {
      if (header.sortable() !== column) {
        header.currentDirection.set("");
      }
    });

    this.service.sortColumn = column;
    this.service.sortDirection = direction;
  }

  onSelect(name: string | undefined): void {
    if (name) {
      this.service.deleteSingleData(name);
    }
  }
}
