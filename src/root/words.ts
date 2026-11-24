// What the landing page says in words and where its links lead (release 0.2.4, step 8; open
// decision #220, item 1): every link to an address that exists.
import { addressOf } from "../help/address";
import type { Stop } from "../help/history";
import { APP } from "./forward";

const NUMBERS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/** A small count in words, as a sentence writes it; in figures past twenty. */
export function inWords(count: number): string {
  return NUMBERS[count] ?? String(count);
}

/** The repository, where the source, the licence and each release's notes are read. */
export const SOURCE = "https://github.com/zoostat/zemp-lite";

/** The address in the app of a page of Help. */
export function inHelp(stop: Stop): string {
  return `${APP}${addressOf(stop)}`;
}

/** A page of Using Zemp Lite, in the app. */
export function usingPage(page: string): string {
  return inHelp({ kind: "using", page });
}

/**
 * Where the notes of a version are read: its notes in the repository for a release, which the
 * build has checked are there; the list of releases for a build between two releases, whose
 * notes are not yet written.
 */
export function notesOf(version: string): string {
  return /^\d+\.\d+\.\d+$/.test(version)
    ? `${SOURCE}/blob/main/docs/releases/${version}-notes.md`
    : `${SOURCE}/releases`;
}
