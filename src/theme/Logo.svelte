<script lang="ts">
  // The logo: D4, the hexagon of contour lines (the design guide, section 1).
  let { size = 34 }: { size?: number } = $props();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
  <g fill="none" stroke="var(--logo-stroke)" stroke-width="5" stroke-linejoin="miter">
    <polygon points="50.0,6.0 88.0,28.0 88.0,72.0 50.0,94.0 12.0,72.0 12.0,28.0" />
    <polygon points="52.6,14.8 80.7,31.1 80.7,63.7 52.6,80.0 24.5,63.7 24.5,31.1" />
    <polygon points="55.2,23.7 73.4,34.2 73.4,55.4 55.2,65.9 37.0,55.4 37.0,34.2" />
  </g>
  <polygon
    points="57.8,32.5 66.2,37.4 66.2,47.0 57.8,51.9 49.4,47.0 49.4,37.4"
    fill="var(--logo-centre)"
  />
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
