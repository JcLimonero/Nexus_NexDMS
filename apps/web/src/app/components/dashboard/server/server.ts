import { DecimalPipe, AsyncPipe, NgClass } from "@angular/common";
import { Component, inject, viewChildren } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { BaseChartDirective } from "ng2-charts";
import { Observable } from "rxjs";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import { SERVERDB, serverDB } from "../../../shared/data/tables/server";
import {
  NgbdSortableHeaderDirective,
  SortEvent,
} from "../../../shared/directives/NgbdSortableHeader";
import { TableService } from "../../../shared/services/table.service";
import * as chartData from "./../../../shared/data/dashboard/server";

export interface ExplorerItem {
  id: number;
  name: string;
  value: string;
}

@Component({
  selector: "app-server",
  imports: [
    FeatherIcons,
    BaseChartDirective,
    NgbModule,
    NgbdSortableHeaderDirective,
    AsyncPipe,
    NgClass,
  ],
  providers: [TableService, DecimalPipe],
  templateUrl: "./server.html",
  styleUrls: ["./server.scss"],
})
export class Server {
  service = inject(TableService);

  public explorer = [];
  public selected = [];

  public tableItem$: Observable<serverDB[]>;
  public searchText: string;
  total$: Observable<number>;

  constructor() {
    const service = this.service;

    this.tableItem$ = service.tableItem$;
    this.total$ = service.total$;
    this.service.setUserData(SERVERDB);
  }

  readonly headers = viewChildren(NgbdSortableHeaderDirective);

  onSort({ column, direction }: SortEvent) {
    this.headers().forEach((header) => {
      if (header.sortable() !== column) {
        header.currentDirection.set("");
      }
    });

    this.service.sortColumn = column;
    this.service.sortDirection = direction;
  }

  public onSelect(selected: ExplorerItem): void {
    this.service.deleteSingleData(selected.id.toString());
  }

  public fetch(cb: (data: ExplorerItem[]) => void): void {
    const req = new XMLHttpRequest();
    req.open("GET", "assets/data/tables/explorer.json");
    req.onload = () => {
      cb(JSON.parse(req.response) as ExplorerItem[]);
    };
    req.send();
  }

  public settings = {
    columns: {
      name: {
        title: "Name",
      },
      user: {
        title: "User Name",
        type: "html",
      },
      IO: {
        title: "IO",
      },
      cpu: {
        title: "CPU",
      },
      mem: {
        title: "MEM",
      },
    },
  };

  public memoryChartType = chartData.memoryChartType;
  public memoryChartLabels = chartData.memoryChartLabels;
  public memoryChartData = chartData.memoryChartData;
  public memoryChartOptions = chartData.memoryChartOptions;
  public memoryChartColors = chartData.memoryChartColors;
  public memoryChartLegend = chartData.memoryChartLegend;

  public cpuChartType = chartData.cpuChartType;
  public cpuChartLabels = chartData.cpuChartLabels;
  public cpuChartData = chartData.cpuChartData;
  public cpuChartOptions = chartData.cpuChartOptions;
  public cpuChartColors = chartData.cpuChartColors;
  public cpuChartLegend = chartData.cpuChartLegend;
}
