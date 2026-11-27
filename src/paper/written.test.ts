import { describe, expect, it } from "vitest";
import {
  digestOf,
  noted,
  readWritten,
  repathed,
  staleOf,
  staleWords,
  writeWritten,
} from "./written";

describe("which script wrote which file", () => {
  it("is noted at each run, the last run's word standing, and written and read back as it was", () => {
    let record = noted({}, ["output/fit.typ", "output/wages.svg"], "scripts/main.zeff", "aa");
    record = noted(record, ["output/other.svg"], "scripts/second.zeff", "bb");
    record = noted(record, ["output/fit.typ"], "scripts/main.zeff", "cc");
    expect(record).toEqual({
      "output/fit.typ": { script: "scripts/main.zeff", digest: "cc" },
      "output/wages.svg": { script: "scripts/main.zeff", digest: "aa" },
      "output/other.svg": { script: "scripts/second.zeff", digest: "bb" },
    });
    const written = writeWritten(record);
    expect(readWritten(written)).toEqual(record);
    // Its files in the order of their paths, under a version.
    expect(Object.keys((JSON.parse(written) as { files: object }).files)).toEqual([
      "output/fit.typ",
      "output/other.svg",
      "output/wages.svg",
    ]);
    expect((JSON.parse(written) as { version: number }).version).toBe(1);
  });

  it("reads nothing from a file that is not there, is damaged, or holds something else", () => {
    expect(readWritten(null)).toEqual({});
    expect(readWritten("{")).toEqual({});
    expect(readWritten("[]")).toEqual({});
    expect(readWritten('{"files": []}')).toEqual({});
    expect(
      readWritten(
        JSON.stringify({
          files: {
            "a.typ": { script: "s.zeff", digest: "aa", more: 1 },
            "b.typ": { script: 3, digest: "bb" },
            "c.typ": "main",
            "d.typ": null,
          },
        }),
      ),
    ).toEqual({ "a.typ": { script: "s.zeff", digest: "aa" } });
  });

  it("follows a file and a script that are renamed or moved, and lets go what is gone", () => {
    const record = {
      "output/fit.typ": { script: "scripts/main.zeff", digest: "aa" },
      "output/figures/wages.svg": { script: "scripts/draw/plots.zeff", digest: "bb" },
    };
    expect(repathed(record, "scripts/main.zeff", "scripts/returns.zeff")).toEqual({
      "output/fit.typ": { script: "scripts/returns.zeff", digest: "aa" },
      "output/figures/wages.svg": { script: "scripts/draw/plots.zeff", digest: "bb" },
    });
    // A folder, with all under it: the files written, and the scripts that wrote.
    expect(repathed(record, "output", "tables")).toEqual({
      "tables/fit.typ": { script: "scripts/main.zeff", digest: "aa" },
      "tables/figures/wages.svg": { script: "scripts/draw/plots.zeff", digest: "bb" },
    });
    expect(repathed(record, "scripts/draw", "scripts/figures")["output/figures/wages.svg"]).toEqual(
      { script: "scripts/figures/plots.zeff", digest: "bb" },
    );
    // Deleted: the file's line, or every line of the script's.
    expect(Object.keys(repathed(record, "output/fit.typ", null))).toEqual([
      "output/figures/wages.svg",
    ]);
    expect(Object.keys(repathed(record, "scripts/draw", null))).toEqual(["output/fit.typ"]);
    // A path that only begins alike is another path.
    expect(repathed(record, "out", "x")).toEqual(record);
  });

  it("digests a text to the SHA-256 of its bytes", async () => {
    expect(await digestOf("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await digestOf("print(1)\n")).not.toBe(await digestOf("print(2)\n"));
    expect(await digestOf("wäge")).toHaveLength(64);
  });
});

describe("a stale file of a paper", () => {
  const record = {
    "output/fit.typ": { script: "scripts/main.zeff", digest: "aa" },
    "output/wages.svg": { script: "scripts/main.zeff", digest: "aa" },
    "output/other.svg": { script: "scripts/second.zeff", digest: "bb" },
  };

  it("is one whose script reads differently now than when it wrote the file", () => {
    const files = ["output/wages.svg", "output/fit.typ", "output/other.svg", "data/note.txt"];
    expect(
      staleOf(record, files, { "scripts/main.zeff": "aa", "scripts/second.zeff": "bb" }),
    ).toEqual([]);
    expect(
      staleOf(record, files, { "scripts/main.zeff": "ab", "scripts/second.zeff": "bb" }),
    ).toEqual([
      { file: "output/fit.typ", script: "scripts/main.zeff" },
      { file: "output/wages.svg", script: "scripts/main.zeff" },
    ]);
    // Only the files the paper uses; a file no run is known to have written marks nothing.
    expect(staleOf(record, ["output/other.svg"], { "scripts/second.zeff": "cc" })).toEqual([
      { file: "output/other.svg", script: "scripts/second.zeff" },
    ]);
    expect(staleOf(record, ["data/note.txt"], { "scripts/main.zeff": "zz" })).toEqual([]);
    // A script that is gone marks nothing: no run of it can write the file again.
    expect(staleOf(record, files, { "scripts/second.zeff": "bb" })).toEqual([]);
  });

  it("is said in a sentence for each script, with what to do", () => {
    expect(staleWords([])).toEqual([]);
    expect(staleWords([{ file: "output/fit.typ", script: "scripts/main.zeff" }])).toEqual([
      "output/fit.typ is stale: scripts/main.zeff has changed since it wrote it. Press Run to write it again.",
    ]);
    expect(
      staleWords([
        { file: "output/other.svg", script: "scripts/second.zeff" },
        { file: "output/fit.typ", script: "scripts/main.zeff" },
        { file: "output/wages.svg", script: "scripts/main.zeff" },
      ]),
    ).toEqual([
      "output/fit.typ and output/wages.svg are stale: scripts/main.zeff has changed since it wrote them. Press Run to write them again.",
      "output/other.svg is stale: scripts/second.zeff has changed since it wrote it. Press Run to write it again.",
    ]);
  });
});
