import { describe, expect, it } from "vitest";
import { APP, forwarded } from "./forward";

describe("an address kept from before 0.2.4", () => {
  it("opens its project in the app", () => {
    expect(forwarded("#/p/scratch")).toBe("/app/#/p/scratch");
    expect(forwarded("#/p/returns%20to%20schooling")).toBe("/app/#/p/returns%20to%20schooling");
  });

  it("opens the naming of a new project in the app", () => {
    expect(forwarded("#/new")).toBe(`${APP}#/new`);
  });

  it("is the front page's own when it names neither", () => {
    expect(forwarded("")).toBeNull();
    expect(forwarded("#")).toBeNull();
    expect(forwarded("#see-it-work")).toBeNull();
    expect(forwarded("#/p/")).toBeNull();
    expect(forwarded("#/p/a/b")).toBeNull();
    expect(forwarded("#/newer")).toBeNull();
  });
});
