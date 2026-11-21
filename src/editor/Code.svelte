<script lang="ts">
  // A piece of Zeff code shown outside the editor (a plot's statement in the Plots place),
  // in the editor's colours: the same small reader of the code's shapes (`zeff.ts`), the same
  // tokens of the look. It stands on the window's ground, the ground those colours are held
  // to (`tokens.ts`).
  import { tokens } from "./zeff";

  let { text }: { text: string } = $props();

  /** The break between two lines, kept as the code has it. */
  const BREAK = "\n";

  /** Each line as its pieces, in order: what has a colour, and what lies between. */
  const lines = $derived(
    text.split("\n").map((line) => {
      const pieces: { text: string; kind: string | null }[] = [];
      let at = 0;
      for (const token of tokens(line)) {
        if (token.from > at) pieces.push({ text: line.slice(at, token.from), kind: null });
        pieces.push({ text: line.slice(token.from, token.to), kind: token.kind });
        at = token.to;
      }
      if (at < line.length) pieces.push({ text: line.slice(at), kind: null });
      return pieces;
    }),
  );
</script>

<code class="mono" data-testid="code"
  >{#each lines as pieces, at (at)}{#if at > 0}{BREAK}{/if}{#each pieces as piece, index (index)}{#if piece.kind === null}{piece.text}{:else}<span
          class={piece.kind}>{piece.text}</span
        >{/if}{/each}{/each}</code
>

<style>
  code {
    color: var(--code-variable);
    display: block;
    font-size: calc(var(--code-size, 14px) - 1.5px);
    line-height: 1.5;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .keyword {
    color: var(--code-keyword);
  }
  .function {
    color: var(--code-function);
  }
  .option {
    color: var(--code-option);
  }
  .operator {
    color: var(--code-operator);
  }
  .text {
    color: var(--code-text);
  }
  .number {
    color: var(--code-number);
  }
  .comment {
    color: var(--code-comment);
    font-style: italic;
  }
  .variable {
    color: var(--code-variable);
  }
</style>
