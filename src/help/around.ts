// What stands around a page of Help, for the Topics pane (release 0.2.3, step 5b; open
// decision #211, item 4): beside a function's page, its package with its functions, the open
// one marked; beside a package's page, its functions; beside a code's page, its family's
// codes; beside a page of Using Zemp Lite, all of those pages. A name two packages have has
// both around it. Home, the codes by family and a name
// the index does not know have nothing around them, and the pane keeps to its sections.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { USING, USING_TITLE } from "../using/pages";
import type { Stop } from "./history";
import { familyOf, homesOf } from "./trail";

/** A page beside the one open: its name, its one line, where it is, and whether it is the one open. */
export interface Neighbour {
  name: string;
  words: string;
  to: Stop;
  here: boolean;
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
  open: string | null,
  own: boolean,
): Around[] {
  const found = index.packages.find((one) => one.name === name);
  if (found === undefined) return [];
  return [
    {
      name,
      words: "",
      to: own ? null : { kind: "package", name },
      kind: "functions",
      rows: found.functions.map((f) => ({
        name: f.name,
        words: f.summary,
        to: { kind: "name", name: f.name },
        here: f.name === open,
      })),
      datasets:
        name === "datasets"
          ? index.datasets.map((d) => ({
              name: d.name,
              words: d.summary,
              to: { kind: "name", name: d.name },
              here: d.name === open,
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
    return homesOf(index, stop.name).flatMap((home) =>
      packageAround(index, home, stop.name, false),
    );
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
