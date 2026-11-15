<script lang="ts">
  // The edge between two panels, which is dragged to resize them, or moved with the arrow
  // keys. It says what it separates and how far it stands, for a screen reader.
  let {
    orientation,
    label,
    value,
    least,
    most,
    ondrag,
    onstep,
  }: {
    /** `vertical` stands between a left and a right panel; `horizontal` between an upper and a lower. */
    orientation: "vertical" | "horizontal";
    label: string;
    /** Where it stands, and the range it moves in, as whole numbers. */
    value: number;
    least: number;
    most: number;
    /** The pointer moved while the edge was held: where it is now, in the window. */
    ondrag: (x: number, y: number) => void;
    /** An arrow key was pressed: towards the start (−1) or the end (+1). */
    onstep: (direction: -1 | 1) => void;
  } = $props();

  let held = $state(false);

  function down(event: PointerEvent): void {
    held = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function move(event: PointerEvent): void {
    if (held) ondrag(event.clientX, event.clientY);
  }

  function up(event: PointerEvent): void {
    held = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  function key(event: KeyboardEvent): void {
    const back = orientation === "vertical" ? "ArrowLeft" : "ArrowUp";
    const forth = orientation === "vertical" ? "ArrowRight" : "ArrowDown";
    if (event.key === back || event.key === forth) {
      event.preventDefault();
      onstep(event.key === back ? -1 : 1);
    }
  }
</script>

<!-- A separator that can be moved is a control: it takes the keyboard's focus. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="splitter {orientation}"
  class:held
  role="separator"
  aria-orientation={orientation}
  aria-label={label}
  aria-valuenow={value}
  aria-valuemin={least}
  aria-valuemax={most}
  tabindex="0"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
></div>

<style>
  .splitter {
    flex: none;
    position: relative;
    touch-action: none;
    z-index: 3;
  }
  .vertical {
    cursor: col-resize;
    margin: 0 -4px;
    width: 8px;
  }
  .horizontal {
    cursor: row-resize;
    height: 8px;
    margin: -4px 0;
  }
  .vertical:hover,
  .vertical.held,
  .vertical:focus-visible {
    background: linear-gradient(
      to right,
      transparent 3px,
      var(--accent) 3px,
      var(--accent) 5px,
      transparent 5px
    );
  }
  .horizontal:hover,
  .horizontal.held,
  .horizontal:focus-visible {
    background: linear-gradient(
      to bottom,
      transparent 3px,
      var(--accent) 3px,
      var(--accent) 5px,
      transparent 5px
    );
  }
  .splitter:focus-visible {
    outline: none;
  }
</style>
