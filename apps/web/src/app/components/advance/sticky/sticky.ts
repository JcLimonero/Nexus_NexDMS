import { Component, ElementRef, inject } from "@angular/core";

import * as data from "../../../shared/data/sticky/sticky";

export interface Notes {
  id: number;
  isDeleted: boolean;
}

@Component({
  selector: "app-sticky",
  imports: [],
  templateUrl: "./sticky.html",
  styleUrls: ["./sticky.scss"],
})
export class Sticky {
  private eRef = inject(ElementRef);

  public notes: Notes[] = data.sticky;

  //Add new sticky note
  addStickyNote() {
    this.notes.push({ id: this.notes.length + 1, isDeleted: false });
  }

  //Delete a particular sticky note
  deleteNote(note: Notes) {
    note.isDeleted = true;
  }
}
