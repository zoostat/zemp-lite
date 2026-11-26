// Home of the Help place, in words and numbers (release 0.2.3, step 9f; open decision #211,
// item 14, the owner's choice of 24 November 2026: a landing page of soft panels). The words
// are Zemp's own, as the owner approved them on the mockup, and are held to the engine by the
// rule of item 12; Zeff's version and every count are read from the engine, Zemp Lite's
// version from the app.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { USING, USING_TITLE } from "../using/pages";
import { CODES, type Stop } from "./history";

/** The words of Home's panels. */
export const HOME_WORDS = {
  title: "Help",
  zeff: "A language for statistics. You write a script; the engine reads the data, runs the tests, fits the models and prints tables and plots. The same script gives the same numbers on every computer, and every function is checked against R and Stata.",
  zemp: "The editor for Zeff in a browser: a script with a note beside each statement, the data and the plots in places of their own, and this Help. Nothing is installed and nothing is sent; the engine runs on this computer and the projects stay in this browser.",
  stage: "alpha",
  topics: "Topics",
  packages:
    "Every function, grouped by what it does. A package's page lists its functions, each with one line.",
  /** The sentence on the codes, around the code it gives as an example. */
  codes: {
    before: "Every message Zeff gives has a code, such as ",
    code: "Z0103",
    after: ". Its page gives the meaning, the usual causes, an example and the fix.",
  },
  using:
    "How to work in this app: projects and scripts, running a script and reading its notes, the Data and Plots places, shortcuts, and where the work is kept.",
} as const;

/** What the page of the packages is called, in the Topics pane, the trail and on Home. */
export const PACKAGES = "Packages";

const counted = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;

/** How many functions the index has: one for each name of each package. */
export const functionsIn = (index: HelpIndex): number =>
  index.packages.reduce((sum, one) => sum + one.functions.length, 0);

/** How many codes the engine explains. */
export const codesIn = (families: CodeFamily[] | null): number =>
  (families ?? []).reduce((sum, one) => sum + one.codes.length, 0);

/** The line of counts under Zeff's words: "266 functions · 11 packages · 148 codes". */
export function countsOf(index: HelpIndex, families: CodeFamily[] | null): string {
  return [
    counted(functionsIn(index), "function", "functions"),
    counted(index.packages.length, "package", "packages"),
    counted(codesIn(families), "code", "codes"),
  ].join(" · ");
}

/** A panel of Home under Topics: its name, its count, and the page a click on it opens. */
export interface TopicPanel {
  key: "packages" | "codes" | "using";
  name: string;
  count: number;
  to: Stop;
}

/** The panels under Topics, one for each section of the Topics pane, in its order. */
export function topicPanels(index: HelpIndex, families: CodeFamily[] | null): TopicPanel[] {
  return [
    { key: "packages", name: PACKAGES, count: index.packages.length, to: { kind: "packages" } },
    { key: "codes", name: CODES, count: codesIn(families), to: { kind: "codes", family: null } },
    { key: "using", name: USING_TITLE, count: USING.length, to: { kind: "using", page: null } },
  ];
}

/** The parts of Home, for the pane On this page: the two panels of what this is, and the topics. */
export function homeParts(index: HelpIndex, families: CodeFamily[] | null): string[] {
  return ["Zeff", "Zemp Lite", ...topicPanels(index, families).map((panel) => panel.name)];
}
