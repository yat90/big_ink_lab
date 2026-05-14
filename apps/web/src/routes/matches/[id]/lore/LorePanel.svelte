<script lang="ts">
  import { t } from '$lib/i18n';

  interface Props {
    player: 'p1' | 'p2';
    lore: number;
    delta: number;
    canEdit: boolean;
    cooldownActive: boolean;
    isWinner: boolean;
    onInc: () => void;
    onDec: () => void;
  }

  let { player, lore, delta, canEdit, cooldownActive, isWinner, onInc, onDec }: Props = $props();
</script>

<div
  class="lore-panel lore-panel--{player}"
  class:lore-panel--winner={isWinner}
  class:lore-panel--cooldown-flash={cooldownActive}
>
  <div class="lore-panel__center">
    {#if canEdit}
      <button type="button" class="lore-panel__btn lore-panel__btn--dec" onclick={onDec} aria-label={$t('matches.lore.decLoreAria')}>−</button>
    {/if}
    <span class="lore-panel__value">
      <span class="lore-panel__number">{lore}</span>
      <span
        class="lore-panel__delta"
        class:lore-panel__delta--pos={delta > 0}
        class:lore-panel__delta--neg={delta < 0}
        aria-label={$t('matches.lore.recentDeltaAria')}
      >
        {#if delta !== 0}{delta > 0 ? '+' : ''}{delta}{/if}
      </span>
    </span>
    {#if canEdit}
      <button type="button" class="lore-panel__btn lore-panel__btn--inc" onclick={onInc} aria-label={$t('matches.lore.incLoreAria')}>+</button>
    {/if}
  </div>
</div>

<style>
  .lore-panel {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .lore-panel--p1 {
    background: rgba(87, 101, 124, 0.65);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
  }

  .lore-panel--p2 {
    background: rgba(122, 54, 171, 0.65);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    transform: rotate(180deg);
  }

  .lore-panel--winner {
    animation: lore-winner-pulse-panel 2s ease-in-out;
    box-shadow: inset 0 0 0 3px var(--ok);
  }

  .lore-panel--cooldown-flash {
    animation: lore-cooldown-nudge 0.22s ease-out;
  }

  @keyframes lore-cooldown-nudge {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.15); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35); }
  }

  @keyframes lore-winner-pulse-panel {
    0%, 100% { box-shadow: inset 0 0 0 3px var(--ok), inset 0 0 24px rgba(34, 197, 94, 0.2); }
    50% { box-shadow: inset 0 0 0 4px var(--ok), inset 0 0 32px rgba(34, 197, 94, 0.35); }
  }

  .lore-panel__center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lore-panel__value {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
    position: absolute;
    pointer-events: none;
    text-align: center;
  }

  .lore-panel__number {
    font-size: 15rem;
    font-weight: 500;
    line-height: 15rem;
    color: #fff;
    min-width: 2ch;
  }

  .lore-panel__delta {
    font-size: 2.4rem;
    font-weight: 700;
    line-height: 1;
    opacity: 0.95;
    letter-spacing: 0.02em;
    min-height: 1.2em;
  }

  .lore-panel__delta--pos {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 8px rgba(134, 239, 172, 0.6);
  }

  .lore-panel__delta--neg {
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 0 8px rgba(248, 113, 113, 0.5);
  }

  .lore-panel__btn {
    width: 50vw;
    height: 50vh;
    min-width: 48px;
    min-height: 48px;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 7rem;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.1s;
    touch-action: manipulation;
    position: relative;
    z-index: 2;
  }

  .lore-panel__btn--dec { transform: translateX(-10%); }
  .lore-panel__btn--inc { transform: translateX(10%); }

  @media (max-width: 480px) {
    .lore-panel__btn {
      min-width: 64px;
      font-size: 4em;
    }
    .lore-panel__btn--dec { transform: translateX(-25%); }
    .lore-panel__btn--inc { transform: translateX(25%); }
  }

  @media (orientation: landscape) {
    .lore-panel__number {
      font-size: clamp(4rem, 36vh, 15rem);
      line-height: 1;
    }
    .lore-panel__delta {
      font-size: clamp(1rem, 4vh, 2.4rem);
      min-height: auto;
    }
    .lore-panel__btn {
      height: 48vh;
      font-size: clamp(3rem, 8vh, 7rem);
    }
  }
</style>
