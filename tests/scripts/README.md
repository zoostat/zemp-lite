# Scripts with what `zeff run` printed for them

Each `name.zeff` here was run as `scripts/main.zeff` of a project by the command line of the released
Zeff 0.7.0, and again by that of the released 0.8.0, which printed, said and wrote the same bytes for
every file here (21 November 2026); what it printed and said is kept beside it as `name.stdout` and `name.stderr`. The
browser tests run the same scripts through the interface and hold what the page shows under the
statements to these files: a plain script, one with warnings, one that stops at an error, and one the engine's check
refuses before it starts.

`example/` is the example the browser tests are written on: the Scratch project's example of release
0.1 (`scripts/main.zeff`), with what the released `zeff run` 0.8.0 printed and said for it
(`expected/`). The tests write it into the Scratch project, whose own scripts a visitor opens
(`examples/scratch/`, with their expected outputs beside them, and tests of their own).

`figures/example-with-exports.zeff` is that example with the two `export` lines the interface
adds to draw its two plots at 567 by 352 pixels (150.02 by 93.13 mm); the two SVG files beside it are
what the released command line wrote for that text. A unit test holds the text the interface composes
to this file, and the engine's worker build to these bytes.

`figures/plots-with-exports.zeff` is the Scratch project's third script, the showcase of plots
(`examples/scratch/scripts/plots.zeff`), with the 21 `export` lines the interface adds to draw its
plots at the same size; `figures/plots-figures.sha256` holds the SHA-256 of each file the released
command line wrote for that text (2.2 MB in all, so their digests are kept in place of the files). A
unit test holds the engine's worker build to these digests.

`figures/schooling-one-column.svg`, `.pdf` and `.png` are what the released command line wrote for the
example with `(schooling).export("zemp-export.<format>", size: one_column)` added: the file the plot
viewer's **Save…** must give for the same plot, format and page, byte for byte.

`specification-sample.stderr` is what the released command line says of the specification's sample
script (`docs/spec/zeff_samples.zeff`) run as a project's `scripts/main.zeff`. That script is written
for Zeff 1.0 and uses a module of a project of its own, so the engines of 0.7.0 and 0.8.0 refuse it before it
runs; the prototype must show the refusal as the command line words it.

`repl/` holds what the released `zeff repl` of 0.8.0 printed and said when it was given, in a new
project, the lines of `console.txt` (`vars.stdout`, `console.stderr`, and the script `:save` wrote,
`explore.zeff`) and of `paths.txt` (`paths.stderr`). The console line's `:vars` and `:save` are held
to them; `:clear`, which the console line has and `zeff repl` does not, is named there as unknown.

`report/` holds the reports the released `zeff report-bug` of 0.8.0 wrote into `.zeff/reports/` for
`error.zeff` and `framed.zeff`, each run as `scripts/main.zeff` of a new project on this machine
(`platform: aarch64 macos`). The worker's report of each is held to them byte for byte; the
browser's, which names its platform `wasm32 browser`, differs in that line alone.

`packages/<package>.txt` is what the released command line prints for `zeff help <package>` (0.8.0),
for the seven packages it lists: the functions with their one lines, in the engine's order. The index
of the help the worker gives is held to them. `text`, `plot` and `datasets` have none: for those
`zeff help` prints the page of the function of that name.

`help-add.txt` is what the released command line prints for `zeff help add` (0.8.0): a page with every
kind of part a function's page has (a list, sub-headings, a table of R and Stata, an example in the
prose, another function of the name to come). The browser tests hold the words of the formatted Help
page to it, and a unit test holds it to what the worker gives.
