<script lang="ts">
  import { browser } from '$app/environment';
  import { portal } from '$lib/portal';
  import { onMount, tick } from 'svelte';

  type Opt = { value: string; label: string };

  let {
    value = $bindable(''),
    options,
    id = undefined,
    placeholder = '—',
    ariaLabel = 'Select',
    disabled = false,
    onchange: onValueChange = undefined,
    className = '',
  }: {
    value?: string;
    options: readonly Opt[];
    id?: string;
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
    className?: string;
  } = $props();

  let open = $state(false);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let listEl = $state<HTMLUListElement | null>(null);
  let listStyle = $state('');

  const GAP = 4;
  const MAX_LIST_H = 280;
  const VIEW_MARGIN = 8;

  const displayLabel = $derived(options.find((o) => o.value === value)?.label ?? placeholder);

  function computeListStyle(): string {
    if (!buttonEl) return '';
    const rect = buttonEl.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportTop = vv?.offsetTop ?? 0;
    const viewportH = vv?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportH;
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    const bottomReserve = mobile ? 80 : 12;
    const safeBottom = viewportBottom - bottomReserve;
    const safeTop = viewportTop + VIEW_MARGIN;
    const spaceBelow = safeBottom - rect.bottom - GAP;
    const spaceAbove = rect.top - safeTop - GAP;
    const openDown = spaceBelow >= 140 || spaceBelow >= spaceAbove;
    let left = rect.left;
    let width = rect.width;
    const vw = window.innerWidth;
    if (left + width > vw - VIEW_MARGIN) {
      width = Math.max(160, vw - 2 * VIEW_MARGIN);
      left = Math.max(VIEW_MARGIN, Math.min(left, vw - width - VIEW_MARGIN));
    }
    if (openDown) {
      const maxHeight = Math.min(MAX_LIST_H, Math.max(80, spaceBelow));
      const top = rect.bottom + GAP;
      return [
        `position:fixed`,
        `z-index:100`,
        `top:${top}px`,
        `left:${left}px`,
        `width:${width}px`,
        `max-height:${maxHeight}px`,
      ].join(';');
    }
    const maxHeight = Math.min(MAX_LIST_H, Math.max(80, spaceAbove));
    const listBottomY = rect.top - GAP;
    const bottomPx = window.innerHeight - listBottomY;
    return [
      `position:fixed`,
      `z-index:100`,
      `bottom:${bottomPx}px`,
      `left:${left}px`,
      `width:${width}px`,
      `max-height:${maxHeight}px`,
    ].join(';');
  }

  async function syncListPosition() {
    await tick();
    listStyle = computeListStyle();
  }

  $effect(() => {
    if (!open || !browser) return;
    void syncListPosition();
    const run = () => {
      listStyle = computeListStyle();
    };
    const main = document.getElementById('main');
    main?.addEventListener('scroll', run, { passive: true });
    window.addEventListener('scroll', run, true);
    window.addEventListener('resize', run);
    const vv = window.visualViewport;
    vv?.addEventListener('scroll', run);
    vv?.addEventListener('resize', run);
    return () => {
      main?.removeEventListener('scroll', run);
      window.removeEventListener('scroll', run, true);
      window.removeEventListener('resize', run);
      vv?.removeEventListener('scroll', run);
      vv?.removeEventListener('resize', run);
    };
  });

  function toggle() {
    if (disabled) return;
    open = !open;
  }

  function select(next: string) {
    value = next;
    open = false;
    onValueChange?.(next);
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

<div class="select-custom {className}">
  <button
    type="button"
    bind:this={buttonEl}
    class="select-custom__trigger input"
    class:select-custom__trigger--open={open}
    class:select-custom__trigger--disabled={disabled}
    {id}
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-disabled={disabled}
    {disabled}
    onclick={toggle}
  >
    <span class="select-custom__value">{displayLabel}</span>
    <span class="select-custom__chevron" aria-hidden="true">▼</span>
  </button>
  {#if open && browser}
    <ul
      use:portal={document.body}
      bind:this={listEl}
      class="select-custom__list"
      style={listStyle}
      role="listbox"
      aria-label={ariaLabel}
    >
      {#each options as opt (opt.value)}
        <li
          role="option"
          class="select-custom__option"
          class:select-custom__option--selected={value === opt.value}
          aria-selected={value === opt.value}
          tabindex="-1"
          onclick={() => select(opt.value)}
          onkeydown={(e) =>
            (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(opt.value))}
        >
          {opt.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select-custom {
    position: relative;
    width: 100%;
  }

  .select-custom__trigger {
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

  .select-custom__trigger:disabled,
  .select-custom__trigger--disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .select-custom__value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .select-custom__chevron {
    flex-shrink: 0;
    font-size: 0.65em;
    opacity: 0.7;
    transition: transform 0.2s var(--ease);
  }

  .select-custom__trigger--open .select-custom__chevron {
    transform: rotate(180deg);
  }

  .select-custom__list {
    margin: 0;
    padding: 4px;
    list-style: none;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
    background: var(--card);
    box-shadow: var(--shadow-lg);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .select-custom__option {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 600;
  }

  .select-custom__option:hover {
    background: var(--glass-bg-strong);
  }

  .select-custom__option--selected {
    background: var(--glass-bg-strong);
  }
</style>
