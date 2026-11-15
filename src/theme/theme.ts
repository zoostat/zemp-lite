// Light and dark (the design guide, section 5): the reader's system setting until a choice is
// made, and then the choice, kept in the browser under `zeff-theme`, the key the website
// uses, so that the choice is shared by every page and by Zemp Lite. It is remembered for the
// user, not for a project (Zemp Specification, section 5, "Themes and access").
import { tokensCss, type ThemeName } from "./tokens";

const KEY = "zeff-theme";

/** As much of the browser's storage as is used, so that a test can stand in for it. */
export interface Kept {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The theme to show: the one chosen, or the system's where none was. */
export function chosen(kept: Kept, systemDark: boolean): ThemeName {
  const stored = read(kept);
  return stored ?? (systemDark ? "dark" : "light");
}

/** Keep a choice. Storage that refuses (a private window) loses it, and nothing else. */
export function keep(kept: Kept, theme: ThemeName): void {
  try {
    kept.setItem(KEY, theme);
  } catch {
    // The choice holds for this visit.
  }
}

function read(kept: Kept): ThemeName | null {
  try {
    const stored = kept.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

/** Put the tokens into the page, once, and show `theme`. */
export function show(document: Document, theme: ThemeName): void {
  if (document.getElementById("zemp-tokens") === null) {
    const style = document.createElement("style");
    style.id = "zemp-tokens";
    style.textContent = tokensCss();
    document.head.append(style);
  }
  document.documentElement.dataset["theme"] = theme;
}
