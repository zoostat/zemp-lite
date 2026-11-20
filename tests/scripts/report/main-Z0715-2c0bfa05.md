# Zeff bug report: an error, Z0715

This file was written by `zeff report-bug` on your computer. Nothing has been sent
anywhere. Read it before you attach it to an issue: it holds statements of your script,
the names and types of your variables and the names of the files they were read from.
It holds no rows of your data.
A message is quoted as it was printed, and a message may name a value where it must (a
text that could not be converted, the levels of a group): read those lines too.

## What went wrong

The script stopped with an error:

    error[Z0715]: no file `data/none.csv` in the project
     --> scripts/main.zeff:3:16
      |
    3 | let w = import("data/none.csv")
      |                ^^^^^^^^^^^^^^^ the file is not there
      |
      = help: put the file in the project and write its path from the project folder, as in `data/none.csv`

## Zeff

- version: 0.8.0
- edition: preview
- platform: aarch64 macos

## The statements

The failing statement and the statements it depends on: 1 of the 4 statements of
`scripts/main.zeff` (line 3). Run alone, it fails in the same way.

    let w = import("data/none.csv")

## The run

- seed: none is set by these statements
- warnings and notes before the failure: none

## The data

The statements kept hold no frame.

The statements read no file.
