# The fonts shipped with Zemp Lite

Three families, each under the SIL Open Font License 1.1, allowed by the owner on 15 November 2026
(`docs/decisions.md`). Each file is as its publisher gives it, unchanged; only the square brackets of
two file names are written as hyphens. Fetched on 15 November 2026 from the publishers' own
repositories at the commits named. A test (`fonts.node.test.ts`) holds each file to its SHA-256.

| File | Publisher's file | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `AtkinsonHyperlegibleNext-wght.woff2` | `fonts/webfonts/AtkinsonHyperlegibleNext[wght].woff2` | 48,188 | `abde1ad5cf78b9ac575ef90d991f2e9101eb0b3b6668bde9a00e2e1e27d99afd` |
| `AtkinsonHyperlegibleNext-Italic-wght.woff2` | `fonts/webfonts/AtkinsonHyperlegibleNext-Italic[wght].woff2` | 52,692 | `34491c5a87f711d314637962f69267d28c7df3ed498082c990cdfbbc02ebf3f2` |
| `JetBrainsMono-Regular.woff2` | `fonts/webfonts/JetBrainsMono-Regular.woff2` | 92,164 | `a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2` |
| `JetBrainsMono-Medium.woff2` | `fonts/webfonts/JetBrainsMono-Medium.woff2` | 93,824 | `086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353` |
| `JetBrainsMono-Italic.woff2` | `fonts/webfonts/JetBrainsMono-Italic.woff2` | 95,864 | `cb6a1b246318ed3885d7dffa14a2609297fe80e9b8e500bea33b52fa312a36a4` |
| `Newsreader-opsz-wght.woff2` | `fonts/variable/woff2/Newsreader[opsz,wght].woff2` | 214,880 | `1faa3380ac0e87e057b180e03fd94bd708a612afb67d2590677be4508909fae9` |

| Family | Use (design guide, section 3) | Publisher's repository | Commit | Licence file |
| --- | --- | --- | --- | --- |
| Atkinson Hyperlegible Next | Text, menus, tables, buttons | `github.com/googlefonts/atkinson-hyperlegible-next` | `7925f50f649b3813257faf2f4c0b381011f434f1` | `AtkinsonHyperlegibleNext-OFL.txt` |
| JetBrains Mono | Code | `github.com/JetBrains/JetBrainsMono`, tag `v2.304` | `cd5227bd1f61dff3bbd6c814ceaf7ffd95e947d9` | `JetBrainsMono-OFL.txt` |
| Newsreader | Large headings only | `github.com/productiontype/Newsreader` | `cfcb4f7af0e52c25e8df2a2431814c8e5fe2e155` | `Newsreader-OFL.txt` |

The italic of Newsreader, which the design guide uses for the tagline alone, is not shipped: no
screen of Zemp Lite shows the tagline yet.
