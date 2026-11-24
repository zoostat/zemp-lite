// An address that opens a page of Help (release 0.2.4, step 3; open decision #220, item 1: the
// landing page's links into Help). Help is a place inside a project, so the app, given such an
// address, opens the Scratch project on the Help place at the page named. The address is the
// app's with `#/help` and, after it, the page: nothing (Home); `using/<page>`; `name/<name>`,
// and for one function of a name with two (#215) its package and what it is called on after
// it; `packages`; `package/<name>`; `codes` or `codes/<family>`; `code/<code>`.
import { usingPage } from "../using/pages";
import { HOME, type Stop } from "./history";

const HELP = "#/help";

const part = (text: string): string | null => {
  try {
    const read = decodeURIComponent(text);
    return read === "" ? null : read;
  } catch {
    return null;
  }
};

/**
 * The page of Help an address names, by what follows its `#`; `null` where the address is not
 * one of Help's. An address of Help that names no page that can be read opens Home; whether
 * the engine has the function or the code named is for the engine to say, as on any page.
 */
export function stopOf(hash: string): Stop | null {
  if (hash !== HELP && !hash.startsWith(`${HELP}/`)) return null;
  const parts = hash.slice(HELP.length + 1).split("/");
  const [kind, first, second, third, ...more] = parts.map((one) => (one === "" ? null : part(one)));
  if (more.length > 0) return HOME;
  const only = (stop: Stop, used: number): Stop =>
    [first, second, third].slice(used).every((one) => one === null || one === undefined)
      ? stop
      : HOME;
  switch (kind) {
    case "using":
      if (first === null || first === undefined) return only({ kind: "using", page: null }, 0);
      return usingPage(first) === null ? HOME : only({ kind: "using", page: first }, 1);
    case "name":
      if (first === null || first === undefined) return HOME;
      if (second === null || second === undefined) return only({ kind: "name", name: first }, 1);
      if (third === null || third === undefined) return HOME;
      return { kind: "name", name: first, form: { package: second, on: third } };
    case "packages":
      return only({ kind: "packages" }, 0);
    case "package":
      return first === null || first === undefined
        ? HOME
        : only({ kind: "package", name: first }, 1);
    case "codes":
      return only({ kind: "codes", family: first ?? null }, 1);
    case "code":
      return first === null || first === undefined ? HOME : only({ kind: "code", code: first }, 1);
    default:
      return HOME;
  }
}

/** What follows the `#` of the address that opens a page of Help. */
export function addressOf(stop: Stop): string {
  const after = (...parts: string[]): string =>
    [HELP, ...parts.map((one) => encodeURIComponent(one))].join("/");
  switch (stop.kind) {
    case "home":
      return HELP;
    case "using":
      return stop.page === null ? after("using") : after("using", stop.page);
    case "name":
      return stop.form === undefined
        ? after("name", stop.name)
        : after("name", stop.name, stop.form.package, stop.form.on);
    case "packages":
      return after("packages");
    case "package":
      return after("package", stop.name);
    case "codes":
      return stop.family === null ? after("codes") : after("codes", stop.family);
    case "code":
      return after("code", stop.code);
  }
}
