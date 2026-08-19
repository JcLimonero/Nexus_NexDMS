import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ToastrService } from "ngx-toastr";

import * as data from "../../shared/data/todo/todo";

export interface Task {
  text: string;
  completed: boolean;
}

@Component({
  selector: "app-to-do",
  imports: [FormsModule],
  templateUrl: "./to-do.html",
  styleUrls: ["./to-do.scss"],
})
export class ToDo {
  private toastrService = inject(ToastrService);

  public text: string;
  public todos: Task[] = data.task;
  public completed: boolean;
  public red_border: boolean = false;
  public visible: boolean;

  public addTask(text: string) {
    if (!text) {
      this.red_border = true;
      return false;
    }
    let task = { text: text, completed: false };
    this.todos.push(task);
    this.text = "";
    this.red_border = false;
    return;
  }

  public taskCompleted(task: Task) {
    task.completed = !task.completed;
    task.completed
      ? this.toastrService.success(task.text, "Mark as completed")
      : this.toastrService.error(task.text, "Mark as Incomplete");
  }

  public taskDeleted(index: number) {
    this.todos.splice(index, 1);
  }

  public markAllAction(action: boolean) {
    this.todos.filter((task) => {
      task.completed = action;
    });
    this.completed = action;
    action
      ? this.toastrService.success("All Task as Completed")
      : this.toastrService.error("All Task as Incomplete");
  }
}
