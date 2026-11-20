# Scripts with what `zeff run` printed for them

Each `name.zeff` here was run as `scripts/main.zeff` of a project by the command line of the released
Zeff 0.7.0, and again by that of the released 0.8.0, which printed, said and wrote the same bytes for
every file here (21 November 2026); what it printed and said is kept beside it as `name.stdout` and `name.stderr`. The
browser tests run the same scripts through the interface and hold what the Output panel shows to these
files: a plain script, one with warnings, one that stops at an error, and one the engine's check
refuses before it starts.

`figures/example-with-exports.zeff` is the Scratch example with the two `export` lines the interface
adds to draw its two plots at 567 by 352 pixels (150.02 by 93.13 mm); the two SVG files beside it are
what the released command line wrote for that text. A unit test holds the text the interface composes
to this file, and the engine's worker build to these bytes.

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
