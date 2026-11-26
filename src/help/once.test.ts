import { describe, expect, it } from "vitest";
import { once } from "./once";

describe("what is asked once and kept", () => {
  it("is asked a single time, and every caller is given the one answer", async () => {
    let asked = 0;
    const index = once(async () => {
      asked += 1;
      return { engine: "0.9.0" };
    });
    const [first, second] = await Promise.all([index(), index()]);
    const third = await index();
    expect(asked).toBe(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("is asked again after an asking that failed, and then kept", async () => {
    let asked = 0;
    const index = once(async () => {
      asked += 1;
      if (asked === 1) throw new Error("the worker is not there");
      return asked;
    });
    await expect(index()).rejects.toThrow("the worker is not there");
    expect(await index()).toBe(2);
    expect(await index()).toBe(2);
    expect(asked).toBe(2);
  });
});
