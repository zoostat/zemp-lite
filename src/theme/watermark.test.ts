import { describe, expect, it } from "vitest";
import { rings } from "./watermark";

describe("the watermark", () => {
  it("is nine hexagons, the logo's three among them", () => {
    const made = rings();
    expect(made).toHaveLength(9);
    // The centre and the two rings round it are the logo's own polygons (to its one decimal).
    expect(made[8]!.points).toBe(
      "57.80,32.50 66.20,37.35 66.20,47.05 57.80,51.90 49.40,47.05 49.40,37.35",
    );
    expect(made[7]!.points).toBe(
      "55.20,23.70 73.47,34.25 73.47,55.35 55.20,65.90 36.93,55.35 36.93,34.25",
    );
    expect(made[6]!.points.startsWith("52.60,14.90 80.75,31.15")).toBe(true);
  });

  it("grows fainter and thinner outwards", () => {
    const made = rings();
    expect(made[7]).toMatchObject({ width: 2.4, opacity: 1 });
    expect(made[0]!.width).toBeCloseTo(0.8, 10);
    expect(made[0]!.opacity).toBeCloseTo(0.28, 10);
    for (let at = 0; at < 7; at++) {
      expect(made[at]!.width).toBeLessThan(made[at + 1]!.width);
    }
  });
});
