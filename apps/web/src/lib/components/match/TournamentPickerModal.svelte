<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';

  /** Move the modal root to document.body so it covers the full viewport. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      },
    };
  }

  export type TournamentPickerRow = { _id: string; name: string; date: string };

  let {
    open = $bindable(false),
    title = 'Select tournament',
    tournaments = [],
    loading = false,
    error = '',
    selectedId = '',
    onSelect,
    onClose,
  }: {
    open?: boolean;
    title?: string;
    tournaments?: TournamentPickerRow[];
    loading?: boolean;
    error?: string;
    selectedId?: string;
    onSelect: (tournamentId: string) => void;
    onClose: () => void;
  } = $props();

  let filterName = $state('');

  $effect(() => {
    if (!open) filterName = '';
  });

  const filtered = $derived.by(() => {
    const q = filterName.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => t.name.toLowerCase().includes(q));
  });

  function formatRowSubtitle(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return '';
    }
  }

  function pick(id: string) {
    onSelect(id);
    onClose();
  }
</script>

{#if open}
  <div
    class="tournament-picker-modal"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-labelledby="tournament-picker-title"
  >
    <button
      type="button"
      class="tournament-picker-modal__backdrop"
      aria-label="Close"
      onclick={onClose}
    ></button>
    <div class="tournament-picker-modal__card" use:focusTrap use:scrollLock>
      <AppCard>
      <h2 id="tournament-picker-title" class="tournament-picker-modal__title">{title}</h2>
      <p class="tournament-picker-modal__hint muted">
        Optional — link this match to a tournament event.
      </p>

      <label for="tournament-picker-filter" class="tournament-picker-modal__label">Search</label>
      <input
        id="tournament-picker-filter"
        type="text"
        class="input tournament-picker-modal__input"
        placeholder="Filter by name…"
        bind:value={filterName}
        aria-label="Filter tournaments by name"
      />

      <div role="status" aria-live="polite" aria-atomic="true" class="tournament-picker-modal__sr-status">
        {#if loading}Loading tournaments…{:else if error}{error}{:else if filtered.length === 0}{tournaments.length === 0 ? 'No tournaments yet.' : 'No tournaments match the filter.'}{/if}
      </div>

      {#if loading}
        <p class="muted">Loading tournaments…</p>
      {:else if error}
        <AppBanner variant="danger" message={error} />
      {:else if filtered.length === 0}
        <p class="muted">
          {tournaments.length === 0 ? 'No tournaments yet.' : 'No tournaments match the filter.'}
        </p>
      {:else}
        <ul class="tournament-picker-modal__list">
          <li class="tournament-picker-modal__item">
            <div class="tournament-picker-modal__item-text">
              <span class="tournament-picker-modal__item-name muted">No tournament</span>
            </div>
            <AppButton type="button" size="sm" aria-label="Select no tournament" onclick={() => pick('')}> Select </AppButton>
          </li>
          {#each filtered as t (t._id)}
            {@const subtitle = formatRowSubtitle(t.date)}
            <li
              class="tournament-picker-modal__item"
              class:tournament-picker-modal__item--current={selectedId === t._id}
            >
              <div class="tournament-picker-modal__item-text">
                <span class="tournament-picker-modal__item-name">{t.name}</span>
                {#if subtitle}
                  <span class="tournament-picker-modal__item-date muted">{subtitle}</span>
                {/if}
              </div>
              <AppButton type="button" variant="primary" size="sm" aria-label="Select {t.name}" onclick={() => pick(t._id)}>
                Select
              </AppButton>
            </li>
          {/each}
        </ul>
      {/if}

        <div class="tournament-picker-modal__actions">
          <AppButton type="button" onclick={onClose}>Cancel</AppButton>
        </div>
      </AppCard>
    </div>
  </div>
{/if}

<style>
  .tournament-picker-modal {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }
  .tournament-picker-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    cursor: pointer;
    width: 100vw;
    height: 100vh;
    z-index: 999;
  }
  .tournament-picker-modal__card {
    position: relative;
    z-index: 1000;
    max-width: 520px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    background: var(--card);
  }
  .tournament-picker-modal__title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
  .tournament-picker-modal__hint {
    margin: -0.35rem 0 0 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .tournament-picker-modal__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--muted);
  }
  .tournament-picker-modal__input {
    width: 100%;
  }
  .tournament-picker-modal__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .tournament-picker-modal__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }
  .tournament-picker-modal__item-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    min-width: 0;
  }
  .tournament-picker-modal__item-name {
    font-weight: 600;
    line-height: 1.25;
  }
  .tournament-picker-modal__item-date {
    font-size: 0.85rem;
  }
  .tournament-picker-modal__item--current {
    border-color: var(--primary, var(--ink));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary, var(--ink)) 35%, transparent);
  }
  .tournament-picker-modal__actions {
    margin-top: auto;
    padding-top: var(--space-sm);
  }
  .tournament-picker-modal__sr-status {
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
</style>
