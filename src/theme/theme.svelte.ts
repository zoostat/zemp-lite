// The theme of this window, for the components: what is shown now, and the switch.
import { chosen, keep, show, type Kept } from "./theme";
import type { ThemeName } from "./tokens";

/** The browser's storage, or nothing kept where the browser refuses it (a private window). */
export function browserStorage(): Kept {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
}

export const theme = $state<{ name: ThemeName }>({ name: "light" });

/** Show the theme chosen before, or the system's. */
export function startTheme(): void {
  theme.name = chosen(browserStorage(), window.matchMedia("(prefers-color-scheme: dark)").matches);
  show(document, theme.name);
}

/** Switch between light and dark, and keep the choice. */
export function switchTheme(): void {
  theme.name = theme.name === "dark" ? "light" : "dark";
  keep(browserStorage(), theme.name);
  show(document, theme.name);
}
