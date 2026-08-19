import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  AngularEditorConfig,
  AngularEditorModule,
} from "@kolkov/angular-editor";
import { Editor, NgxEditorModule } from "ngx-editor";

@Component({
  selector: "app-editor",
  imports: [NgxEditorModule, FormsModule, AngularEditorModule],
  templateUrl: "./editor.html",
  styleUrls: ["./editor.scss"],
})
export class Editors implements OnInit {
  public htmlContent = "";
  public editor: Editor;
  public html = "";

  ngOnInit(): void {
    this.editor = new Editor();
  }

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: "auto",
    minHeight: "0",
    maxHeight: "auto",
    width: "auto",
    minWidth: "0",
    translate: "yes",
    enableToolbar: true,
    showToolbar: true,
    placeholder: "Enter text here...",
    defaultParagraphSeparator: "",
    defaultFontName: "",
    defaultFontSize: "",
    fonts: [
      { class: "arial", name: "Arial" },
      { class: "times-new-roman", name: "Times New Roman" },
      { class: "calibri", name: "Calibri" },
      { class: "comic-sans-ms", name: "Comic Sans MS" },
    ],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: "redText",
        class: "redText",
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ],
  };
  // make sure to destory the editor
  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
