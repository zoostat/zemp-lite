import { describe, expect, it } from "vitest";
import stderr from "../../tests/scripts/trail.stderr?raw";
import { said } from "../output/run";
import { trailOf } from "./trail";

describe("the error's trail", () => {
  it("is the chain the engine names, from the script's line to the line that raised it", () => {
    const error = said(stderr).find((one) => one.kind === "error")!;
    expect(trailOf(error.raw, error.sentence)).toEqual([
      {
        file: "scripts/main.zeff",
        line: 14,
        column: 7,
        text: "in_year(data: a frame of 18,412 rows × 11 variables, y: 1900)",
        raised: false,
      },
      {
        file: "scripts/main.zeff",
        line: 9,
        column: 5,
        text: "returns(data: a frame of 0 rows × 11 variables)",
        raised: false,
      },
      {
        file: "scripts/main.zeff",
        line: 3,
        column: 20,
        text: "no row remains to fit the model: the frame has no rows",
        raised: true,
      },
    ]);
  });

  it("is empty for an error not raised inside a function", () => {
    const error = said(
      "error[Z0103]: no function is called `nosuch`\n --> scripts/main.zeff:2:9\n",
    )[0]!;
    expect(trailOf(error.raw, error.sentence)).toEqual([]);
  });
});
