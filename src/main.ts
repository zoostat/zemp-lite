// Where the interface starts: one window, mounted on the page's one element.
import { mount } from "svelte";
import App from "./app/App.svelte";
import "./theme/fonts.css";
import "./theme/base.css";
import { startTheme } from "./theme/theme.svelte";

const target = document.getElementById("app");
if (target === null) {
  throw new Error("the page has no element with the id `app`");
}

startTheme();

export default mount(App, { target });
