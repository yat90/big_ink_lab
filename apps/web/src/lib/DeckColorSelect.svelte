<script lang="ts">
  import { DECK_COLOR_OPTIONS } from '$lib/matches';
  import InkIcons from '$lib/InkIcons.svelte';
  import { onMount } from 'svelte';

  /** Selected deck color value, e.g. "Amber / Amethyst" or "" */
  let {
    value = $bindable(''),
    id = undefined,
    ariaLabel = 'Deck color',
    disabled = false,
    onchange = undefined,
    className = '',
    hideLabel = false
  }: {
    value?: string;
    id?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
    className?: string;
    /** When true, only show ink icons in the trigger (no deck color name text). */
    hideLabel?: boolean;
  } = $props();

  let open = $state(false);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let listEl = $state<HTMLUListElement | null>(null);

  function toggle() {
    if (disabled) return;
    open = !open;
  }

  function select(c: string) {
    value = c;
    open = false;
    onchange?.(c);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      open = false;
      buttonEl?.focus();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as Node;
    if (open && buttonEl && !buttonEl.contains(target) && listEl && !listEl.contains(target)) {
      open = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="deck-color-select {className || ''}">
  <button
    type="button"
    bind:this={buttonEl}
    class="deck-color-select__trigger input"
    class:deck-color-select__trigger--open={open}
    class:deck-color-select__trigger--disabled={disabled}
    id={id}
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-disabled={disabled}
    disabled={disabled}
    onclick={toggle}
  >
    {#if value}
      <span class="deck-color-select__value">
        <InkIcons deckColor={value} size="sm" />
        {#if !hideLabel}
          <span class="deck-color-select__label">{value}</span>
        {/if}
      </span>
    {:else}
      <span class="deck-color-select__placeholder">—</span>
    {/if}
    <span class="deck-color-select__chevron" aria-hidden="true">▼</span>
  </button>
  {#if open}
    <ul
      bind:this={listEl}
      class="deck-color-select__list"
      role="listbox"
      aria-label={ariaLabel}
    >
      <li
        role="option"
        class="deck-color-select__option"
        class:deck-color-select__option--selected={value === ''}
        aria-selected={value === ''}
        tabindex="-1"
        onclick={() => select('')}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(''))}
      >
        <span class="deck-color-select__placeholder">—</span>
      </li>
      {#each DECK_COLOR_OPTIONS as c}
        <li
          role="option"
          class="deck-color-select__option"
          class:deck-color-select__option--selected={value === c}
          aria-selected={value === c}
          tabindex="-1"
          onclick={() => select(c)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(c))}
        >
          <InkIcons deckColor={c} size="sm" />
          <span class="deck-color-select__label">{c}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .deck-color-select {
    position: relative;
    width: 100%;
  }

  .deck-color-select__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    width: 100%;
    min-height: 46px;
    text-align: left;
    cursor: pointer;
    appearance: none;
  }

  .deck-color-select__trigger:disabled,
  .deck-color-select__trigger--disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .deck-color-select__value,
  .deck-color-select__option {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .deck-color-select__placeholder {
    color: var(--muted);
  }

  .deck-color-select__label {
    white-space: nowrap;
  }

  @media (max-width: 639px) {
    .deck-color-select__label {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  .deck-color-select__chevron {
    flex-shrink: 0;
    font-size: 0.65em;
    opacity: 0.7;
    transition: transform 0.2s var(--ease);
  }

  .deck-color-select__trigger--open .deck-color-select__chevron {
    transform: rotate(180deg);
  }

  .deck-color-select__list {
    position: absolute;
    z-index: 9999;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
    background: var(--card);
    box-shadow: var(--shadow-lg);
    max-height: 280px;
    overflow-y: auto;
  }

  .deck-color-select__option {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 600;
  }

  .deck-color-select__option:hover {
    background: var(--glass-bg-strong);
  }

  .deck-color-select__option--selected {
    background: var(--glass-bg-strong);
  }
</style>
