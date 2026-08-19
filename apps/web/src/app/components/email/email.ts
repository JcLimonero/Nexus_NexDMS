import { NgClass, SlicePipe, TitleCasePipe } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { Editor, NgxEditorModule } from "ngx-editor";

import { Mail } from "../../shared/data/email/email";
import { IEmail } from "../../shared/model/email.model";

@Component({
  selector: "app-email",
  imports: [
    NgxEditorModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgClass,
    SlicePipe,
    TitleCasePipe,
  ],
  templateUrl: "./email.html",
  styleUrls: ["./email.scss"],
})
export class Email implements OnInit {
  public compose: boolean = true;
  public allEmails: IEmail[] = Mail.Emails;
  public selectEmail: IEmail | null = null;
  public selectedEmails: IEmail[] = [];
  public editorValue: string = "";
  public type: string = "";
  public editor: Editor;
  public html = "";

  // make sure to destroy the editor

  getUserEmail(type: string) {
    let emails: IEmail[] = [];
    return this.allEmails.filter((email) => {
      if (type == "allMail") {
        return emails.push(email);
      } else if (type == "favorite") {
        if (email.favorite) {
          return emails.push(email);
        }
      } else if (email.type === type) {
        return emails.push(email);
      }
      return;
    });
  }

  selectedUserEmail(email: IEmail) {
    this.selectEmail = email;
    this.compose = false;
  }

  selectedMail(event: Event, email: IEmail): void {
    const checkbox = event.target as HTMLInputElement;
    const index = this.selectedEmails.indexOf(email);
    if (checkbox.checked && index === -1) {
      this.selectedEmails.push(email);
    } else if (!checkbox.checked && index !== -1) {
      this.selectedEmails.splice(index, 1);
    }
  }

  moveEmails(val: string) {
    if (!val) return;
    this.selectedEmails.filter((email) => {
      return (email.type = val);
    });
  }

  addFavorite(email: IEmail) {
    email.favorite = !email.favorite;
  }

  ngOnInit(): void {
    this.editor = new Editor();
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
