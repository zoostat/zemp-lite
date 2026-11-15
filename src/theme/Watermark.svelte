<script lang="ts">
  // The watermark behind the welcome screen: never behind code, always behind the content.
  import { rings } from "./watermark";

  const made = rings();
  const centre = made[made.length - 1];
</script>

<div class="watermark" aria-hidden="true">
  <svg viewBox="-75 -50 230 230">
    <defs>
      <linearGradient id="watermark-stroke" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--violet-2)" />
        <stop offset="1" stop-color="var(--violet-3)" />
      </linearGradient>
    </defs>
    <g fill="none" stroke="url(#watermark-stroke)" stroke-linejoin="miter">
      {#each made.slice(0, -1) as ring (ring.points)}
        <polygon points={ring.points} stroke-width={ring.width} stroke-opacity={ring.opacity} />
      {/each}
    </g>
    {#if centre}
      <polygon points={centre.points} fill="var(--violet-2)" opacity="0.55" />
    {/if}
  </svg>
</div>

<style>
  .watermark {
    aspect-ratio: 1;
    -webkit-mask-image: radial-gradient(closest-side, #000 55%, transparent 100%);
    mask-image: radial-gradient(closest-side, #000 55%, transparent 100%);
    opacity: 0.16;
    pointer-events: none;
    position: absolute;
    right: -14%;
    top: 50%;
    transform: translateY(-50%);
    width: min(760px, 80vw);
    z-index: 0;
  }
  :global(:root[data-theme="dark"]) .watermark {
    opacity: 0.24;
  }
  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
  @media print {
    .watermark {
      display: none;
    }
  }
</style>
