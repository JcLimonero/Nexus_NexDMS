import { Injectable } from "@angular/core";

import { Observable, Subscriber } from "rxjs";
import { map } from "rxjs/operators";

import { ChatDB } from "../../shared/data/chat/chat";
import {
  IChat,
  IChatUsers,
  IMessagePayload,
} from "../../shared/model/chat.model";

var today = new Date().toLocaleString("en-US", {
  hour: "numeric",
  minute: "numeric",
  hour12: true,
});

@Injectable({
  providedIn: "root",
})
export class ChatService {
  public observer: Subscriber<{}>; // still valid
  public chat: IChat[] = [];
  public users: IChatUsers[] = [];

  constructor() {
    this.chat = ChatDB.chat;
    this.users = ChatDB.chatUser;
  }

  // Get User Data
  public getUsers(): Observable<IChatUsers[]> {
    return new Observable<IChatUsers[]>((observer) => {
      observer.next(this.users);
      observer.complete();
    });
  }

  // Get current user
  public getCurrentUser(): Observable<IChatUsers | undefined> {
    return this.getUsers().pipe(
      map((users) => users.find((item) => item.authenticate === 1)),
    );
  }

  // Chat to user
  public chatToUser(id: number): Observable<IChatUsers | undefined> {
    return this.getUsers().pipe(
      map((users) => users.find((item) => item.id === id)),
    );
  }

  // Get users chat
  public getUserChat(): Observable<IChat[]> {
    return new Observable<IChat[]>((observer) => {
      observer.next(this.chat);
      observer.complete();
    });
  }

  // Get chat history
  public getChatHistory(id: number): Observable<IChat | undefined> {
    return this.getUserChat().pipe(
      map((users) => users.find((item) => item.id === id)),
    );
  }

  // Send Message to user
  public sendMessage(chat: IMessagePayload): void {
    this.chat.filter((chats) => {
      if (chats.id === chat.receiver) {
        chats.message.push({
          sender: chat.sender,
          time: today.toLowerCase(),
          text: chat.message,
        });

        setTimeout(() => {
          document
            .querySelector(".chat-history")
            ?.scrollBy({ top: 200, behavior: "smooth" });
        }, 310);

        this.responseMessage(chat);
      }
    });
  }

  public responseMessage(chat: IMessagePayload): void {
    this.chat.filter((chats) => {
      if (chats.id === chat.receiver) {
        setTimeout(() => {
          chats.message.push({
            sender: chat.receiver,
            time: today.toLowerCase(),
            text: `Hey This is ${chat.receiver_name}, Sorry I busy right now, I will text you later`,
          });
        }, 2000);

        setTimeout(() => {
          document
            .querySelector(".chat-history")
            ?.scrollBy({ top: 200, behavior: "smooth" });
        }, 2310);
      }
    });
  }
}
