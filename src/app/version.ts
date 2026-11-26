// The version of Zemp Lite and of the Zeff engine it runs on (Zemp Specification,
// section 15: each Zemp release names the engine versions it supports).

/** The version of this build, as `package.json` has it: `0.2.1` or, between releases, `0.2.1-dev`. */
export const VERSION: string = __ZEMP_VERSION__;

/** The Zeff engine this release runs on. */
export const ENGINE = "0.9.0";

/**
 * A version as the interface writes it: major and minor alone where the patch is 0, as the
 * release plan names its releases ("0.1"), and anything after the three numbers kept.
 */
export function shown(version: string): string {
  const parts = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (parts === null) {
    return version;
  }
  const [, major, minor, patch, rest] = parts;
  return patch === "0" ? `${major}.${minor}${rest}` : `${major}.${minor}.${patch}${rest}`;
}

/** The SHA-256 of the engine's file this build was made with, which a first visit checks. */
export const ENGINE_SHA256: string | null = __ENGINE_SHA256__;

/** The size of the engine's file, in bytes, against which its fetching is counted. */
export const ENGINE_BYTES: number | null = __ENGINE_BYTES__;
