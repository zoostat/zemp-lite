# What is changed in this copy

This folder is a copy of the crate `hypher` 0.1.8 as published on crates.io
(https://github.com/typst/hypher), licensed under MIT or Apache-2.0 at your choice; both licences
are beside this file. It was changed on 27 November 2026 for Zemp Lite, and is not the published
crate:

- The hyphenation patterns of fifteen languages are taken out, because the patterns themselves
  (which the crate embeds) are not under a permissive licence: Afrikaans, Catalan, Greek, Croatian,
  Icelandic, Georgian, Kurmanji, Dutch, Russian, Serbian, Swedish, Turkish and Ukrainian (the LPPL),
  Hungarian (MPL, GPL or LGPL) and Slovak (GPL). Their files in `tries/` are deleted and their
  features removed from `Cargo.toml`. `src/lang.rs` is as published: each of them is still written
  there behind its feature, which no longer exists, so it is not compiled, and a text in such a
  language has no language to be hyphenated in and is set unbroken.
- The 33 languages that remain are as published.
- The crate's own test, which generates `src/lang.rs` and the files of `tries/` from the patterns,
  is left out with the patterns it reads (`tests/`, `patterns/`), and its entry is removed from
  `Cargo.toml`.

`README.md` is the published one and speaks of the published crate (48 languages).
