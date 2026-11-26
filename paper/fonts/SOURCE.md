# The fonts a paper is set in

The Paper module holds no font of its own: Typst's bundled fonts are behind a feature that is left off,
because not all of them are under a licence this project ships (`docs/decisions.md`, 27 November 2026).
The page gives Typst the files of this folder, and any font file of the reader's project.

## Libertinus Serif: the text of a paper

Typst's own default face for text, under the SIL Open Font License 1.1 (allowed by the owner's ruling of
15 November 2026 for fonts under that licence). The four files are Typst's own copies, taken unchanged from
the crate `typst-assets` 0.15.1 as cargo fetched it from crates.io (the crate whose `fonts` feature compiles
them into the desktop Typst), so a paper is set here in the very files the desktop Typst 0.15.1 embeds. A test
(`tests/fonts.rs`) holds each file to its SHA-256.

| File | In `typst-assets` 0.15.1 | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `LibertinusSerif-Regular.otf` | `files/fonts/LibertinusSerif-Regular.otf` | 337,132 | `fcf06307a77367394fcb0ccb241e59eea70dba3d732be309647611224679c733` |
| `LibertinusSerif-Italic.otf` | `files/fonts/LibertinusSerif-Italic.otf` | 332,312 | `9a393d63d6e05f620d3dc0190dfd35a8ede58c0808cf0fc9de7fcb9c723e4c24` |
| `LibertinusSerif-Bold.otf` | `files/fonts/LibertinusSerif-Bold.otf` | 293,908 | `0264914210ed51b3231ebc92ce529e9f2e166ba9eebf0cd4a579558690a27b64` |
| `LibertinusSerif-BoldItalic.otf` | `files/fonts/LibertinusSerif-BoldItalic.otf` | 259,176 | `47a665259f09f554f5d133d7718cdad43ff462c6a6b2328f38023465e62d57ce` |

The licence and the copyright notice, as that crate's `NOTICE` gives them: `LibertinusSerif-OFL.txt`.

## Mathematics and code

Not here yet. Typst's defaults are New Computer Modern Math, which is under a licence this project does not
ship (the GUST Font Licence), and DejaVu Sans Mono, whose terms the owner has not ruled on. What a paper sets
its formulas and its code in is settled at step 11c of release 0.3, by the owner's answers.
