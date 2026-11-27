// The sample paper of the Scratch project (release 0.3, step 15c; the owner's answer to
// question 4): one page that sets a table and a figure a script of the project exports, there
// when a first visitor opens Paper. This part of the app is asked for only then, so a visit
// that never opens Paper fetches none of it (the figure alone is 127 kB).
//
// The table and the figure are the engine's own: the files `scripts/paper.zeff` writes when
// it is run, kept in `examples/scratch/output/` and held to the engine byte for byte by a
// test (`sample.node.test.ts`). So the page a visitor first sees is the page **Run** makes.
import paper from "../../examples/scratch/paper/paper.typ?raw";
import script from "../../examples/scratch/scripts/paper.zeff?raw";
import table from "../../examples/scratch/output/returns.typ?raw";
import figure from "../../examples/scratch/output/schooling.svg?raw";

/** The sample's paper, by its path in the project. */
export const SAMPLE_PAPER = "paper/paper.typ";
/** The script that writes the sample's table and figure. */
export const SAMPLE_SCRIPT = "scripts/paper.zeff";
/** The files that script writes. */
export const SAMPLE_WRITTEN = ["output/returns.typ", "output/schooling.svg"];

/** The files of the sample, each by its path in the project, with its text. */
export const SAMPLE: { path: string; text: string }[] = [
  { path: SAMPLE_SCRIPT, text: script },
  { path: "output/returns.typ", text: table },
  { path: "output/schooling.svg", text: figure },
  { path: SAMPLE_PAPER, text: paper },
];
