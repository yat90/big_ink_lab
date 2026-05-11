<script lang="ts">
  import { getInkColors, INK_IMAGE } from '$lib/matches';

  /** Deck color label, e.g. "Amber / Amethyst" */
  export let deckColor: string | undefined = undefined;
  /** Optional size class for different contexts (e.g. "ink-icons--sm") */
  export let size: 'default' | 'sm' = 'default';
</script>

{#if deckColor}
  {@const colors = getInkColors(deckColor)}
  {#if colors}
    <span
      class="ink-icons ink-icons--{size}"
      title={deckColor}
      aria-hidden="true"
      role="img"
      aria-label={deckColor}
    >
      <img src={INK_IMAGE[colors[0]]} alt="" width="20" height="20" />
      <img src={INK_IMAGE[colors[1]]} alt="" width="20" height="20" />
    </span>
  {:else}
    <span title={deckColor}>{deckColor}</span>
  {/if}
{/if}
