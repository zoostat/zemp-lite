# The fonts a paper is set in

The Paper module holds no font of its own: Typst's bundled fonts are behind a feature that is left off,
because not all of them are under a licence this project ships (`docs/decisions.md`, 27 November 2026).
The page gives Typst the files of this folder, and any font file of the reader's project. A test
(`tests/fonts.rs`) holds every file to its SHA-256 and the folder to this list.

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

## DejaVu Sans Mono: the code of a paper

Typst's own default face for code, under the Bitstream Vera terms with the Arev terms, the changes of the
DejaVu project being in the public domain: free and permissive, and allowed by the owner's word of
27 November 2026 ("Yes to both"). So code in a paper sets here as Typst sets it, with no line in the paper.
The four files are Typst's own copies, taken unchanged from the crate `typst-assets` 0.15.1 as the Libertinus
Serif files were, and held to their SHA-256 by the same test.

| File | In `typst-assets` 0.15.1 | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `DejaVuSansMono.ttf` | `files/fonts/DejaVuSansMono.ttf` | 340,712 | `b4a6c3e4faab8773f4ff761d56451646409f29abedd68f05d38c2df667d3c582` |
| `DejaVuSansMono-Bold.ttf` | `files/fonts/DejaVuSansMono-Bold.ttf` | 331,992 | `bce60f1b4421acd9ea51ba6623d7024ecbe6817a953e3654df62a5e6bdf8f769` |
| `DejaVuSansMono-Oblique.ttf` | `files/fonts/DejaVuSansMono-Oblique.ttf` | 251,932 | `742097840c541870e8d6dc5c9b37bb1ceeea6c0dedd1d475faf903ef9df734b0` |
| `DejaVuSansMono-BoldOblique.ttf` | `files/fonts/DejaVuSansMono-BoldOblique.ttf` | 253,580 | `91713a71d550bba22c2a6b2bb2a9ad8f9a159e12e4e9f0a5b2677998ba21213e` |

The terms, as that crate's `NOTICE` gives them for the DejaVu fonts: `DejaVuSansMono-LICENSE.txt`. Its last
part is of TeX Gyre DJV Math, a font of the same project that is not carried here; it is kept because it is
part of the terms as they are published.

## Libertinus Math: the mathematics of a paper

Typst's own face for mathematics, New Computer Modern Math, is under a licence this project does not ship
(the GUST Font Licence). Libertinus Math is of the same family as the text face and under the SIL Open Font
License 1.1. Typst names its own face in its code, so a new paper begins with the line that names this one:

    #show math.equation: set text(font: "Libertinus Math")

The file is the publisher's own, unchanged: `Libertinus-7.051/static/OTF/LibertinusMath-Regular.otf` of the
archive `Libertinus-7.051.zip` (9,400,628 bytes) of release `v7.051` of `github.com/alerque/libertinus`
(26 September 2024; the tag is on commit `9c31f8b436b8ea33dccffbca3972a88d5ff75b0f`). The publisher's
repository holds the font's sources and not the finished file, so the file's bytes alone were taken out of
that archive, checked against the archive's own check of them, on 27 November 2026, with the owner's leave of
that day. It is of the same version, 7.051, as Typst's copies of Libertinus Serif above.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `LibertinusMath-Regular.otf` | 588,848 | `ded714b0d3808af527438ed7a85f16933133f66a12104c4a83db4cc248888011` |
| `LibertinusMath-OFL.txt` | 4,426 | `9aeecc8107c489ec1ec0068b0313e531a760edf3493705b32ab8ab8215a8794e` |

The licence is `OFL.txt` of that repository at the same tag, unchanged.
