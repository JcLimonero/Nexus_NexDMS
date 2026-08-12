import { inject } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterStateSnapshot, TitleStrategy } from "@angular/router";

const APP_TITLE = "NexDMS";

export class NexDMSTitleStrategy extends TitleStrategy {
  private title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot) ?? this.getTitleFromData(snapshot);
    const finalTitle = title ? `${APP_TITLE} - ${title}` : APP_TITLE;
    this.title.setTitle(finalTitle);
  }

  private getTitleFromData(snapshot: RouterStateSnapshot): string | undefined {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data["title"] as string | undefined;
  }
}
