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
  let activeIndex = $state(-1);

  const listId = `select-list-${Math.random().toString(36).slice(2, 9)}`;

  function optId(i: number) {
    return `${listId}-opt-${i}`;
  }

  const activeOptId = $derived(
    open && activeIndex >= 0 && activeIndex < options.length ? optId(activeIndex) : undefined
  );

  const GAP = 4;
  const MAX_LIST_H = 280;
  const VIEW_MARGIN = 8;

  const displayLabel = $derived(options.find((o) => o.value === value)?.label ?? placeholder);

  function getInitialActiveIndex(): number {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  }

  function scrollActiveIntoView() {
    if (!listEl || activeIndex < 0) return;
    const opt = listEl.children[activeIndex] as HTMLElement | undefined;
    opt?.scrollIntoView({ block: 'nearest' });
  }

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
    if (!open) activeIndex = getInitialActiveIndex();
    open = !open;
  }

  function select(next: string) {
    value = next;
    open = false;
    onValueChange?.(next);
    buttonEl?.focus();
  }

  function handleButtonKeydown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        activeIndex = getInitialActiveIndex();
        open = true;
        void tick().then(scrollActiveIntoView);
      } else {
        activeIndex = Math.min(activeIndex + 1, options.length - 1);
        scrollActiveIntoView();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        activeIndex = options.length - 1;
        open = true;
        void tick().then(scrollActiveIntoView);
      } else {
        activeIndex = Math.max(activeIndex - 1, 0);
        scrollActiveIntoView();
      }
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      activeIndex = 0;
      scrollActiveIntoView();
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      activeIndex = options.length - 1;
      scrollActiveIntoView();
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        select(options[activeIndex].value);
      } else {
        open = false;
        buttonEl?.focus();
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      open = false;
      buttonEl?.focus();
    } else if (e.key === 'Tab' && open) {
      open = false;
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
    return () => {
      document.removeEventListener('click', handleClickOutside);
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
    role="combobox"
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={listId}
    aria-activedescendant={activeOptId}
    aria-disabled={disabled}
    {disabled}
    onclick={toggle}
    onkeydown={handleButtonKeydown}
  >
    <span class="select-custom__value">{displayLabel}</span>
    <span class="select-custom__chevron" aria-hidden="true">▼</span>
  </button>
  {#if open && browser}
    <ul
      use:portal={document.body}
      bind:this={listEl}
      id={listId}
      class="select-custom__list"
      style={listStyle}
      role="listbox"
      aria-label={ariaLabel}
    >
      {#each options as opt, i (opt.value)}
        <li
          id={optId(i)}
          role="option"
          class="select-custom__option"
          class:select-custom__option--selected={value === opt.value}
          class:select-custom__option--active={activeIndex === i}
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

  .select-custom__option--active {
    background: var(--glass-bg-strong);
    outline: 2px solid var(--primary, var(--ink, currentColor));
    outline-offset: -2px;
  }
</style>
