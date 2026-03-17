import { DecimalPipe, AsyncPipe, NgClass } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { Observable } from "rxjs";

import { supportDB } from "../../shared/data/tables/support-ticket";
import {
  NgbdSortableHeaderTwoDirective,
  SortColumn,
  SortDirection,
  SortEvent,
} from "../../shared/directives/sor-table.directive";
import { SupportTicketService } from "../../shared/services/support-ticket.service";

@Component({
  selector: "app-support-ticket",
  imports: [
    FormsModule,
    NgbdSortableHeaderTwoDirective,
    NgbModule,
    AsyncPipe,
    NgClass,
  ],
  templateUrl: "./support-ticket.html",
  styleUrls: ["./support-ticket.scss"],
  providers: [SupportTicketService, DecimalPipe],
})
export class SupportTicket {
  service = inject(SupportTicketService);

  public selected = [];

  public tableItem$: Observable<supportDB[]>;
  public searchText = "";
  total$: Observable<number>;

  sortColumn: SortColumn = "";
  sortDirection: SortDirection = "";

  constructor() {
    this.tableItem$ = this.service.support$;
    this.total$ = this.service.total$;
  }

  onSort({ column, direction }: SortEvent) {
    this.sortColumn = column;
    this.sortDirection = direction;

    this.service.sortColumn = column;
    this.service.sortDirection = direction;
  }
}
