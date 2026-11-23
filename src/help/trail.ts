// The trail at the head of a page of Help (release 0.2.3, step 3b; open decision #211, part
// 3): where the page stands, each step before the last a link. _Help › Packages › stats ›
// t_test_; _Help › Errors and warnings › Z01xx › Z0101_. The steps are worked out from the
// index of the help and the codes by family, which are the engine's; a page the index does
// not know (a function of a later release, a name mistyped) stands under Help alone.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { CODES, HOME, type Stop } from "./history";

/**
 * A step of the trail: its words; the page it opens, or none for the page shown, which is
 * the last; whether it is a name of the engine's (a package, a function, a code), set in the
 * code's type; and whether it stands beside the step before it, not under it (the second
 * package of a name two packages have).
 */
export interface Step {
  label: string;
  to: Stop | null;
  name: boolean;
  beside: boolean;
}

const word = (label: string, to: Stop | null): Step => ({ label, to, name: false, beside: false });
const name = (label: string, to: Stop | null, beside = false): Step => ({
  label,
  to,
  name: true,
  beside,
});

/** The packages of the index that have a function, or a dataset, of a name. */
export function homesOf(index: HelpIndex | null, of: string): string[] {
  if (index === null) return [];
  const homes = index.packages
    .filter((one) => one.functions.some((f) => f.name === of))
    .map((one) => one.name);
  const shipped = index.datasets.some((one) => one.name === of);
  const datasets = index.packages.some((one) => one.name === "datasets");
  if (shipped && datasets && !homes.includes("datasets")) homes.push("datasets");
  return homes;
}

/** The family a code is of, by its pattern (`Z01xx`), or none where no family lists it. */
export function familyOf(families: CodeFamily[] | null, code: string): string | null {
  return families?.find((one) => one.codes.some((c) => c.code === code))?.name ?? null;
}

/** The trail of a page. Its last step is the page itself and opens nothing. */
export function trailOf(
  stop: Stop,
  index: HelpIndex | null,
  families: CodeFamily[] | null,
): Step[] {
  const help = (last: boolean) => word("Help", last ? null : HOME);
  // In this stage Home is the index by package, so it is the page of the packages too.
  const packages = word("Packages", HOME);
  const codes = (last: boolean) => word(CODES, last ? null : { kind: "codes", family: null });
  switch (stop.kind) {
    case "home":
      return [help(true)];
    case "package":
      return [help(false), packages, name(stop.name, null)];
    case "name": {
      const homes = homesOf(index, stop.name);
      if (homes.length === 0) return [help(false), name(stop.name, null)];
      return [
        help(false),
        packages,
        ...homes.map((home, at) => name(home, { kind: "package", name: home }, at > 0)),
        name(stop.name, null),
      ];
    }
    case "codes":
      return stop.family === null
        ? [help(false), codes(true)]
        : [help(false), codes(false), name(stop.family, null)];
    case "code": {
      const family = familyOf(families, stop.code);
      return [
        help(false),
        codes(false),
        ...(family === null ? [] : [name(family, { kind: "codes", family })]),
        name(stop.code, null),
      ];
    }
  }
}
