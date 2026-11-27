import { describe, expect, it } from "vitest";
import { READ_LIMIT, isText, readOnlyWords } from "./text";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("a file that is text, to be read", () => {
  it("is valid UTF-8 from first to last, in any language, with its tabs and line breaks", () => {
    expect(isText(bytes("\\begin{tabular}{lrr}\n educ & 0.074 \\\\\n\\end{tabular}\n"))).toBe(true);
    expect(isText(bytes("id,wage\r\n1,23.5\r\n"))).toBe(true);
    expect(isText(bytes("col\tcol\n"))).toBe(true);
    expect(isText(bytes("Löhne · ε ≥ 0 · 賃金 · R²\n"))).toBe(true);
    expect(isText(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(true);
    // An empty file is text, with nothing in it; so is one a terminal coloured.
    expect(isText(new Uint8Array(0))).toBe(true);
    expect(isText(bytes("\u001b[1mbold\u001b[0m\n"))).toBe(true);
  });

  it("is not a file whose bytes are not UTF-8, or that holds what only a file that is not text holds", () => {
    // Latin-1's ö alone, a sequence cut short, and a byte no UTF-8 text has.
    expect(isText(new Uint8Array([76, 0xf6, 104, 110, 101]))).toBe(false);
    expect(isText(new Uint8Array([0xe2, 0x82]))).toBe(false);
    expect(isText(new Uint8Array([104, 105, 0xff]))).toBe(false);
    // A null, as every compressed or compiled file soon holds; and the first bytes of a PNG.
    expect(isText(new Uint8Array([104, 105, 0, 104, 105]))).toBe(false);
    expect(isText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false);
    expect(isText(new Uint8Array([104, 105, 7]))).toBe(false);
  });

  it("is no larger than a megabyte: at the limit it is shown, a byte over it is not", () => {
    expect(READ_LIMIT).toBe(1_000_000);
    expect(isText(new Uint8Array(READ_LIMIT).fill(97))).toBe(true);
    expect(isText(new Uint8Array(READ_LIMIT + 1).fill(97))).toBe(false);
  });

  it("is said to be read only, and under output to be written again by the next run", () => {
    expect(readOnlyWords("data/notes.csv")).toBe(
      "Read only: this file is shown to be read, and is not changed here.",
    );
    expect(readOnlyWords("output/table_iv.tex")).toBe(
      "Read only: this file is shown to be read, and is not changed here. It is in output, where the scripts write: the next run that writes it replaces it.",
    );
    expect(readOnlyWords("outputs/x.tex")).not.toContain("the next run");
    // Where the script that wrote it is known, it is named, and Run is that script's.
    expect(readOnlyWords("output/table_iv.tex", "scripts/instruments.zeff")).toBe(
      "Read only: this file is shown to be read, and is not changed here. scripts/instruments.zeff wrote it: Run runs that script, and writes it again.",
    );
  });
});
