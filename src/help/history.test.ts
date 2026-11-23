import { describe, expect, it } from "vitest";
import {
  HOME,
  KEPT,
  after,
  back,
  before,
  begun,
  called,
  forward,
  here,
  opened,
  same,
  type History,
  type Stop,
} from "./history";

const name = (of: string): Stop => ({ kind: "name", name: of });
const code = (of: string): Stop => ({ kind: "code", code: of });
const through = (...stops: Stop[]): History => stops.reduce(opened, begun());

describe("the history of the Help place", () => {
  it("begins with nothing opened, and nowhere to go", () => {
    const history = begun();
    expect(here(history)).toBeNull();
    expect(before(history)).toBeNull();
    expect(after(history)).toBeNull();
    expect(back(history)).toBe(history);
    expect(forward(history)).toBe(history);
  });

  it("keeps the pages opened in order, the last one shown", () => {
    const history = through(HOME, name("reg"), code("W0201"));
    expect(history.stops).toEqual([HOME, name("reg"), code("W0201")]);
    expect(here(history)).toEqual(code("W0201"));
    expect(before(history)).toEqual(name("reg"));
    expect(after(history)).toBeNull();
  });

  it("goes back and forward through them, and stays at either end", () => {
    const whole = through(HOME, name("reg"), name("t_test"));
    const one = back(whole);
    expect(here(one)).toEqual(name("reg"));
    expect(after(one)).toEqual(name("t_test"));
    const two = back(one);
    expect(here(two)).toEqual(HOME);
    expect(before(two)).toBeNull();
    expect(back(two)).toBe(two);
    expect(here(forward(forward(two)))).toEqual(name("t_test"));
    expect(forward(whole)).toBe(whole);
    // Going about changes where one stands, never the pages.
    expect(two.stops).toEqual(whole.stops);
  });

  it("drops what lay forward when a page is opened after going back", () => {
    const history = opened(back(back(through(HOME, name("reg"), name("t_test")))), name("anova"));
    expect(history.stops).toEqual([HOME, name("anova")]);
    expect(here(history)).toEqual(name("anova"));
    expect(after(history)).toBeNull();
  });

  it("enters the page shown once, however often it is opened in a row", () => {
    const history = through(HOME, name("reg"), name("reg"), name("reg"));
    expect(history.stops).toEqual([HOME, name("reg")]);
    expect(opened(history, name("reg"))).toBe(history);
    // Opened again later, after another page, it is a new entry.
    expect(through(name("reg"), HOME, name("reg")).stops).toHaveLength(3);
    // Opening the page one went back to changes nothing, and keeps what lies forward.
    const gone = back(through(HOME, name("reg"), name("t_test")));
    expect(opened(gone, name("reg"))).toBe(gone);
  });

  it("tells a package from the function of its name, and one family of codes from another", () => {
    const plot: Stop = { kind: "package", name: "plot" };
    expect(same(plot, name("plot"))).toBe(false);
    expect(same(plot, { kind: "package", name: "plot" })).toBe(true);
    expect(same(plot, { kind: "package", name: "stats" })).toBe(false);
    const all: Stop = { kind: "codes", family: null };
    const names: Stop = { kind: "codes", family: "Z01xx" };
    expect(same(all, { kind: "codes", family: null })).toBe(true);
    expect(same(all, names)).toBe(false);
    expect(same(names, { kind: "codes", family: "Z01xx" })).toBe(true);
    expect(same(names, code("Z0101"))).toBe(false);
    // The function and then its package are two pages of the history.
    expect(through(name("plot"), plot).stops).toHaveLength(2);
    expect(called(plot)).toBe("plot");
    expect(called(all)).toBe("Errors and warnings");
    expect(called(names)).toBe("Z01xx");
  });

  it("tells a name from a code of the same letters, and Home from both", () => {
    expect(same(name("W0201"), code("W0201"))).toBe(false);
    expect(same(code("W0201"), code("W0201"))).toBe(true);
    expect(same(name("plot"), name("plot"))).toBe(true);
    expect(same(name("plot"), name("plots"))).toBe(false);
    expect(same(HOME, { kind: "home" })).toBe(true);
    expect(same(HOME, name("Home"))).toBe(false);
  });

  it("forgets the oldest pages of a long history, and still goes back through the rest", () => {
    let history = begun();
    for (let at = 0; at < KEPT + 50; at++) history = opened(history, name(`f${at}`));
    expect(history.stops).toHaveLength(KEPT);
    expect(here(history)).toEqual(name(`f${KEPT + 49}`));
    expect(history.stops[0]).toEqual(name("f50"));
    for (let at = 0; at < KEPT + 50; at++) history = back(history);
    expect(here(history)).toEqual(name("f50"));
    expect(before(history)).toBeNull();
  });

  it("names a stop for the button that goes to it", () => {
    expect(called(HOME)).toBe("Home");
    expect(called(name("t_test"))).toBe("t_test");
    expect(called(code("Z0402"))).toBe("Z0402");
  });
});
