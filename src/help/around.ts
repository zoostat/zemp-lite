// What stands around a page of Help, for the Topics pane (release 0.2.3, step 5b; open
// decision #211, item 4): beside a function's page, its package with its functions, the open
// one marked; beside a package's page, its functions; beside a code's page, its family's
// codes; beside a page of Using Zemp Lite, all of those pages. A name two packages have has
// both around it. Home, the codes by family and a name
// the index does not know have nothing around them, and the pane keeps to its sections.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { USING, USING_TITLE } from "../using/pages";
import { formsOf, onOf, sameForm, severalOf, type Form } from "./forms";
import type { Stop } from "./history";
import { familyOf, homesOf } from "./trail";

/** A page beside the one open: its name, its one line, where it is, and whether it is the one open. */
export interface Neighbour {
  name: string;
  words: string;
  to: Stop;
  here: boolean;
  /** Which function of its name it is, where the name has two: "of a frame" (#215). */
  of?: string;
}

/**
 * A group of neighbours: what holds them (a package, a family of codes), by its name and, for
 * a family, what it is of; the page of that holder, or none where it is the page open; what
 * they are (`functions`, `codes`); and, under `datasets`, the shipped datasets after the
 * functions.
 */
export interface Around {
  name: string;
  words: string;
  to: Stop | null;
  kind: "functions" | "codes" | "pages";
  rows: Neighbour[];
  datasets: Neighbour[];
}

function packageAround(
  index: HelpIndex,
  name: string,
  open: { name: string; form?: Form } | null,
  own: boolean,
): Around[] {
  const found = index.packages.find((one) => one.name === name);
  if (found === undefined) return [];
  const several = severalOf(index);
  return [
    {
      name,
      words: "",
      to: own ? null : { kind: "package", name },
      kind: "functions",
      rows: found.functions.map((f): Neighbour => {
        if (!several.has(f.name)) {
          return {
            name: f.name,
            words: f.summary,
            to: { kind: "name", name: f.name },
            here: f.name === open?.name,
          };
        }
        // A function of a name that has two: listed apart, marked where it is the one open;
        // beside the chooser of the name, both are.
        const form = { package: name, on: onOf(f) };
        return {
          name: f.name,
          words: f.summary,
          to: { kind: "name", name: f.name, form },
          here: f.name === open?.name && (open.form === undefined || sameForm(open.form, form)),
          of: formsOf(index, f.name).find((one) => sameForm(one.form, form))?.words ?? "",
        };
      }),
      datasets:
        name === "datasets"
          ? index.datasets.map((d) => ({
              name: d.name,
              words: d.summary,
              to: { kind: "name", name: d.name },
              here: d.name === open?.name,
            }))
          : [],
    },
  ];
}

/** What stands around a page: none, one group, or one for each package of a name two have. */
export function aroundOf(
  stop: Stop | null,
  index: HelpIndex | null,
  families: CodeFamily[] | null,
): Around[] {
  if (stop === null) return [];
  if (stop.kind === "package") {
    return index === null ? [] : packageAround(index, stop.name, null, true);
  }
  if (stop.kind === "name") {
    if (index === null) return [];
    // One function of a name that has two stands in its own package alone.
    const homes =
      stop.form !== undefined && formsOf(index, stop.name).length > 1
        ? [stop.form.package]
        : homesOf(index, stop.name);
    return homes.flatMap((home) => packageAround(index, home, stop, false));
  }
  if (stop.kind === "code") {
    const family = families?.find((one) => one.name === familyOf(families, stop.code));
    if (family === undefined) return [];
    return [
      {
        name: family.name,
        words: family.area,
        to: { kind: "codes", family: family.name },
        kind: "codes",
        rows: family.codes.map((one) => ({
          name: one.code,
          words: one.title,
          to: { kind: "code", code: one.code },
          here: one.code === stop.code,
        })),
        datasets: [],
      },
    ];
  }
  if (stop.kind === "using" && stop.page !== null) {
    // Beside a page of the app's own: all of them, in their order.
    return [
      {
        name: USING_TITLE,
        words: "",
        to: { kind: "using", page: null },
        kind: "pages",
        rows: USING.map((page) => ({
          name: page.title,
          words: page.line,
          to: { kind: "using", page: page.slug },
          here: page.slug === stop.page,
        })),
        datasets: [],
      },
    ];
  }
  return [];
}

/** A function in the list of them all: a neighbour, with the package it is of. */
export interface Listed extends Neighbour {
  package: string;
}

/**
 * Every function the engine has, by its name (release 0.3.1, step 11a; open decision #245:
 * **Functions** in the index of Help): one row for each function of each package, a name that
 * is two functions listed twice, each saying which it is (#215); in the order of the names,
 * and of the packages where a name stands in two. The one whose page is open is marked.
 */
export function functionsOf(index: HelpIndex | null, stop: Stop | null): Listed[] {
  if (index === null) return [];
  const open = stop?.kind === "name" ? stop : null;
  const rows = index.packages.flatMap((one) =>
    (packageAround(index, one.name, open, false)[0]?.rows ?? []).map((row): Listed => ({
      ...row,
      package: one.name,
    })),
  );
  const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return rows.sort((a, b) => order(a.name, b.name) || order(a.package, b.package));
}
