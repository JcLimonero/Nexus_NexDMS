import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

/**
 * Switch for demo data.
 *
 * Some screens show made-up content so the product can be demoed without a
 * loaded database. That content must NOT reach a real dealership: an advisor
 * looking at a fake conversation has no way to tell there is nobody waiting
 * for a reply on the other end.
 *
 * ⚠️ Set to `false` before deploying to production.
 *
 * To check it without recompiling, from the browser console:
 *   localStorage.setItem("nexdms.demo", "off")   → hides it
 *   localStorage.removeItem("nexdms.demo")       → back to the value here
 */
const SHOW_DEMO_DATA = true;

const DEMO_KEY = "nexdms.demo";

export function inDemoMode(): boolean {
  try {
    const override = localStorage.getItem(DEMO_KEY);
    if (override === "off") return false;
    if (override === "on") return true;
  } catch {
    // localStorage blocked (private mode / iframe): fall back to the constant.
  }
  return SHOW_DEMO_DATA;
}

/**
 * Closes off screens that only exist for the demo.
 *
 * Hiding them from the menu is not enough: without this, turning the switch
 * off would still let the screen open for anyone typing the URL or holding a
 * bookmark, which is exactly how fake data leaks into production.
 */
export const demoOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inDemoMode() ? true : router.createUrlTree(["/workshop/citas"]);
};
