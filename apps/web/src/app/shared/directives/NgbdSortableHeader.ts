import {
  Directive,
  HostBinding,
  HostListener,
  input,
  output,
  signal,
  effect,
} from "@angular/core";

export interface SupportTicketItem {
  img: string;
  name: string;
  position: string;
  salary: string;
  office: string;
  skill: string;
  progress: string;
  extn: number;
  email: string;
  company: string;
  user: string;
  IO: string;
  cpu: string;
  mem: string;
}

export type SortColumn = keyof SupportTicketItem | "";
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
  selector: "th[sortable]",
  standalone: true,
})
export class NgbdSortableHeaderDirective {
  readonly sortable = input<SortColumn>("");
  readonly direction = input<SortDirection>("");
  readonly currentDirection = signal<SortDirection>("");

  readonly sort = output<SortEvent>();

  constructor() {
    effect(() => {
      this.currentDirection.set(this.direction());
    });
  }

  @HostBinding("class.asc")
  get isAsc(): boolean {
    return this.currentDirection() === "asc";
  }

  @HostBinding("class.desc")
  get isDesc(): boolean {
    return this.currentDirection() === "desc";
  }

  @HostListener("click")
  rotateColumn(): void {
    const next = rotate[this.currentDirection()];
    this.currentDirection.set(next);

    this.sort.emit({
      column: this.sortable(),
      direction: next,
    });
  }
}
