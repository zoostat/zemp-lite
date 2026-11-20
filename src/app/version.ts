// The version of Zemp Lite and of the Zeff engine it runs on (Zemp Specification,
// section 15: each Zemp release names the engine versions it supports).

/** The version of this build, as `package.json` has it: `0.2.0` or, between releases, `0.2.0-dev`. */
export const VERSION: string = __ZEMP_VERSION__;

/** The Zeff engine this release runs on. */
export const ENGINE = "0.8.0";

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
