// Where the root of the address starts (release 0.2.4, step 2): an address kept from before
// goes on to the app, before anything is drawn; any other shows the front page.
import { mount } from "svelte";
import "../theme/fonts.css";
import "../theme/base.css";
import { startTheme } from "../theme/theme.svelte";
import { forwarded } from "./forward";
import Root from "./Root.svelte";

const to = forwarded(window.location.hash);
if (to !== null) {
  window.location.replace(to);
} else {
  const target = document.getElementById("root");
  if (target === null) {
    throw new Error("the page has no element with the id `root`");
  }
  startTheme();
  mount(Root, { target });
}
