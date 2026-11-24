import { describe, expect, it } from "vitest";
import { APP, forwarded } from "./forward";

describe("an address of release 0.2.4, with /app/ in it", () => {
  it("opens its project at the root", () => {
    expect(forwarded("#/p/scratch")).toBe("/#/p/scratch");
    expect(forwarded("#/p/returns%20to%20schooling")).toBe("/#/p/returns%20to%20schooling");
  });

  it("opens the naming of a new project at the root", () => {
    expect(forwarded("#/new")).toBe(`${APP}#/new`);
  });

  it("opens a page of Help at the root", () => {
    expect(forwarded("#/help")).toBe("/#/help");
    expect(forwarded("#/help/name/reg")).toBe("/#/help/name/reg");
    expect(forwarded("#/help/using/finding-help")).toBe("/#/help/using/finding-help");
  });

  it("is the root itself when nothing follows", () => {
    expect(forwarded("")).toBe("/");
    expect(forwarded("#")).toBe("/");
  });

  it("carries whatever else follows to the app, which reads it as it reads any address", () => {
    expect(forwarded("#/p/a/b")).toBe("/#/p/a/b");
    expect(forwarded("#nothing-of-the-app")).toBe("/#nothing-of-the-app");
  });
});
