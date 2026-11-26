// The types of `paper-lib.mjs`, for the build's configuration, which is checked as TypeScript.

/** A file packed tight, kept by what the file holds. */
export function packedOf(
  file: string,
  kept: string,
): { buffer: Buffer; digest: string; packed: Buffer };

/** A file of the Paper module as it travels. */
export interface PaperFile {
  name: string;
  bytes: number;
  sha256: string;
  travels: number;
}

export function paperFacts(root: string): {
  module: PaperFile;
  fonts: PaperFile[];
  travels: number;
};
export function fontFiles(root: string): string[];
export const LIMIT_BYTES: number;
export class PaperError extends Error {}
