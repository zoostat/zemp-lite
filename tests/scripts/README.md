# Scripts with what `zeff run` printed for them

Each `name.zeff` here was run as `scripts/main.zeff` of a project by the command line of the released
Zeff 0.7.0, and what it printed and said is kept beside it as `name.stdout` and `name.stderr`. The
browser tests run the same scripts through the interface and hold what the Output panel shows to these
files: a plain script, one with warnings, one that stops at an error, and one the engine's check
refuses before it starts.

`figures/example-with-exports.zeff` is the Scratch example with the two `export` lines the interface
adds to draw its two plots at 567 by 352 pixels (150.02 by 93.13 mm); the two SVG files beside it are
what the released command line wrote for that text. A unit test holds the text the interface composes
to this file, and the engine's worker build to these bytes.
