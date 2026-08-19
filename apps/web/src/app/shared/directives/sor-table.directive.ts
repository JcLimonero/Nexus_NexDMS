import { Directive, input, output } from "@angular/core";

import { supportDB } from "../data/data-table/data-table";

export type SortColumn = keyof supportDB | "";
export type SortDirection = "asc" | "desc" | "";

const rotate: Record<SortDirection, SortDirection> = {
  asc: "desc",
  desc: "",
  "": "asc",
};

export interface SortEvent {
  column: SortColumn;
  direction: SortDirection;
}

@Directive({
  standalone: true,
  selector: "th[sortable]",
  host: {
    "[class.asc]": 'direction() === "asc"',
    "[class.desc]": 'direction() === "desc"',
    "(click)": "rotate()",
  },
})
export class NgbdSortableHeaderTwoDirective {
  readonly sortable = input<SortColumn>("");
  readonly direction = input<SortDirection>("");
  readonly sort = output<SortEvent>();

  rotate() {
    const next = rotate[this.direction()];
    this.sort.emit({ column: this.sortable(), direction: next });
  }
}
