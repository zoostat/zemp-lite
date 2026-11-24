<script lang="ts" module>
  /** The icons of the loading, project and landing screens, each inside the logo's hexagon. */
  export type HexName =
    | "new"
    | "zip"
    | "folder"
    | "play"
    | "here"
    | "lock"
    | "no-account"
    | "bolt"
    | "out"
    | "zeff"
    | "app"
    | "packages"
    | "codes"
    | "book"
    | "same"
    | "teach"
    | "search"
    | "bars";
</script>

<script lang="ts">
  // An icon in the look of 0.2.4's screens (the design guide, section 9; open decision #220):
  // a line drawing inside a hexagon, in the colour of the text it stands beside unless given
  // another. It says nothing to a reader: the words beside it do.
  let { name, size = 44 }: { name: HexName; size?: number } = $props();
</script>

<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
  <polygon class="hx" points="32.0,3.0 57.1,17.5 57.1,46.5 32.0,61.0 6.9,46.5 6.9,17.5" />
  {#if name === "new"}
    <path d="M32 22v20M22 32h20" />
  {:else if name === "zip"}
    <rect x="22" y="20" width="20" height="24" rx="2" />
    <path d="M30 20v4h4v4h-4v4h4v4" />
  {:else if name === "folder"}
    <path d="M19 25h10l3 3h13v15H19z" />
  {:else if name === "play"}
    <path d="M27 22 43 32 27 42Z" />
  {:else if name === "here"}
    <circle cx="32" cy="32" r="12" />
    <path d="M20 32h24" />
    <path d="M32 20c-5 6-5 18 0 24M32 20c5 6 5 18 0 24" />
  {:else if name === "lock"}
    <rect x="22" y="30" width="20" height="14" rx="2" />
    <path d="M26 30v-5a6 6 0 0 1 12 0v5" />
  {:else if name === "no-account"}
    <circle cx="32" cy="26" r="6" />
    <path d="M21 43c1-6 5-9 11-9s10 3 11 9" />
    <path d="M19 19 45 45" />
  {:else if name === "bolt"}
    <path d="M35 18 24 35h9l-3 12 11-17h-9z" />
  {:else if name === "out"}
    <path d="M32 40V21M25 28l7-7 7 7M22 37v6h20v-6" />
  {:else if name === "zeff"}
    <path d="M24 23h16L24 41h16" />
  {:else if name === "app"}
    <rect x="20" y="22" width="24" height="20" rx="2" />
    <path d="M20 28h24M26 34l3 2-3 2M33 38h5" />
  {:else if name === "packages"}
    <path d="M32 19 44 25.5v13L32 45 20 38.5v-13zM20 25.5 32 32l12-6.5M32 32v13" />
  {:else if name === "codes"}
    <path d="M32 20 45 43H19zM32 29v6M32 39v.5" />
  {:else if name === "book"}
    <path d="M32 24c-3-2-7-3-12-3v20c5 0 9 1 12 3 3-2 7-3 12-3V21c-5 0-9 1-12 3zM32 24v20" />
  {:else if name === "same"}
    <path d="M21 28h22M21 36h22" />
  {:else if name === "teach"}
    <path d="M18 27 32 20 46 27 32 34Z" />
    <path d="M23 30v8c0 3 4 5 9 5s9-2 9-5v-8" />
    <path d="M46 27v9" />
  {:else if name === "search"}
    <circle cx="29" cy="29" r="8" />
    <path d="M35 35 44 44" />
  {:else if name === "bars"}
    <path d="M19 44h26" />
    <rect x="21" y="32" width="5" height="12" />
    <rect x="29.5" y="24" width="5" height="20" />
    <rect x="38" y="29" width="5" height="15" />
  {/if}
</svg>

<style>
  svg {
    color: var(--accent);
    display: block;
    flex: none;
  }
  .hx {
    fill: none;
    opacity: 0.5;
    stroke: currentColor;
    stroke-width: 2.2;
  }
  path,
  circle,
  rect {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.8;
  }
</style>
