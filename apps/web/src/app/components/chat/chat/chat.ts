import { NgClass } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule, ReactiveFormsModule, NgForm } from "@angular/forms";

import {
  IChatUsers,
  IChatMessage,
  IChatProfile,
  IMessages,
} from "../../../shared/model/chat.model";
import { ChatService } from "../../../shared/services/chat.service";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgClass],
  templateUrl: "./chat.html",
  styleUrls: ["./chat.scss"],
})
export class Chat implements OnInit {
  private chatService = inject(ChatService);

  public openTab: string = "call";
  public users: IChatUsers[] = [];
  public searchUsers: IChatUsers[] = [];
  public chatUser!: IChatUsers;
  public profile!: IChatProfile;
  public chats: IMessages[] = [];
  public chatText: string = "";
  public error: boolean = false;
  public notFound: boolean = false;
  public id: number = 1;
  public searchText: string = "";

  constructor() {
    this.chatService.getUsers().subscribe((users) => {
      this.searchUsers = users;
      this.users = users;
    });
  }

  ngOnInit(): void {
    this.userChat(this.id);
    this.getProfile();
  }

  public tabbed(val: string): void {
    this.openTab = val;
  }

  // Get user Profile
  public getProfile(): void {
    this.chatService.getCurrentUser().subscribe((userProfile) => {
      if (userProfile) {
        this.profile = userProfile;
      }
    });
  }

  // User Chat
  public userChat(id: number = 1): void {
    this.chatService.chatToUser(id).subscribe((chatUser) => {
      if (chatUser) {
        this.chatUser = chatUser;
      }
    });
    this.chatService.getChatHistory(id).subscribe((chat) => {
      this.chats = chat?.message ?? [];
    });
  }

  // Send Message to User
  public sendMessage(form: NgForm): void {
    if (!form.value.message) {
      this.error = true;
      return;
    }

    this.error = false;

    const chat: IChatMessage = {
      sender: this.profile.id,
      receiver: this.chatUser.id,
      receiver_name: this.chatUser.name,
      message: form.value.message,
    };

    this.chatService.sendMessage(chat);
    this.chatText = "";
    this.chatUser.seen = "online";
    this.chatUser.online = true;
  }

  public searchTerm(term: string): void {
    if (!term) {
      this.searchUsers = this.users;
      return;
    }

    term = term.toLowerCase();
    this.searchUsers = this.users.filter((user) =>
      user.name.toLowerCase().includes(term),
    );
  }
}
