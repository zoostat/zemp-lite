/// <reference types="svelte" />
/// <reference types="vite/client" />

/** The version in `package.json`, put into the build by `vite.config.ts`. */
declare const __ZEMP_VERSION__: string;

/** The SHA-256 of the engine's WebAssembly this build was made with, in hex; `null` before the worker is built. */
declare const __ENGINE_SHA256__: string | null;

/** The size of that file in bytes; `null` before the worker is built. */
declare const __ENGINE_BYTES__: number | null;

/**
 * What the loading screen says of the engine's size, taken from the engine the build carries
 * (`tools/facts.mjs`); `null` before the worker is built, which a build refuses.
 */
declare const __ZEMP_FACTS__: { travels: number } | null;
