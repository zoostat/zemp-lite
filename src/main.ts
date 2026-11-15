// Where the interface starts: one window, mounted on the page's one element.
import { mount } from "svelte";
import App from "./app/App.svelte";

const target = document.getElementById("app");
if (target === null) {
  throw new Error("the page has no element with the id `app`");
}

export default mount(App, { target });
