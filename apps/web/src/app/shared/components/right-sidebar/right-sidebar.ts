import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { IChatUsers } from "../../../shared/model/chat.model";
import { ChatService } from "../../../shared/services/chat.service";

@Component({
  selector: "app-right-sidebar",
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: "./right-sidebar.html",
  styleUrls: ["./right-sidebar.scss"],
})
export class RightSidebar {
  private chatService = inject(ChatService);

  public users: IChatUsers[] = [];
  public searchUsers: IChatUsers[] = [];
  public notFound: boolean = false;
  public searchText: string = "";

  constructor() {
    this.chatService.getUsers().subscribe((users: IChatUsers[]) => {
      this.users = users;
      this.searchUsers = users;
    });
  }

  searchTerm(term: string): void {
    if (!term) {
      this.searchUsers = this.users;
      this.notFound = false;
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filteredUsers: IChatUsers[] = this.users.filter((user) =>
      user.name.toLowerCase().includes(lowerTerm),
    );

    this.checkSearchResultEmpty(filteredUsers);
    this.searchUsers = filteredUsers;
  }

  checkSearchResultEmpty(users: IChatUsers[]): void {
    this.notFound = users.length === 0;
  }
}
