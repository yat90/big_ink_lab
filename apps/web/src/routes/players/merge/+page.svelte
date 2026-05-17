<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authMe } from '$lib/me';
  import { get } from 'svelte/store';
  import { config } from '$lib/config';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { toast } from '$lib/toast';

  type Player = { _id: string; name: string; team?: string; isGuest?: boolean };

  const apiUrl = config.apiUrl ?? '/api';

  let isAdmin = $state(false);
  let authLoaded = $state(false);

  let sourceQuery = $state('');
  let targetQuery = $state('');
  let sourceResults = $state<Player[]>([]);
  let targetResults = $state<Player[]>([]);
  let selectedSource = $state<Player | null>(null);
  let selectedTarget = $state<Player | null>(null);
  let searchingSource = $state(false);
  let searchingTarget = $state(false);
  let sourceError = $state('');
  let targetError = $state('');

  let confirmed = $state(false);
  let merging = $state(false);
  let mergeError = $state('');

  onMount(() => {
    const me = get(authMe);
    if (me !== null) {
      isAdmin = me.user?.role === 'admin';
      authLoaded = true;
    } else {
      const unsub = authMe.subscribe((val) => {
        if (val !== null) {
          isAdmin = val.user?.role === 'admin';
          authLoaded = true;
          unsub();
        }
      });
    }
  });

  let sourceDebounce: ReturnType<typeof setTimeout>;
  let targetDebounce: ReturnType<typeof setTimeout>;

  function onSourceInput() {
    selectedSource = null;
    confirmed = false;
    mergeError = '';
    clearTimeout(sourceDebounce);
    if (!sourceQuery.trim()) {
      sourceResults = [];
      return;
    }
    sourceDebounce = setTimeout(() => searchPlayers('source'), 280);
  }

  function onTargetInput() {
    selectedTarget = null;
    confirmed = false;
    mergeError = '';
    clearTimeout(targetDebounce);
    if (!targetQuery.trim()) {
      targetResults = [];
      return;
    }
    targetDebounce = setTimeout(() => searchPlayers('target'), 280);
  }

  async function searchPlayers(side: 'source' | 'target') {
    const query = side === 'source' ? sourceQuery : targetQuery;
    if (!query.trim()) return;
    if (side === 'source') {
      searchingSource = true;
      sourceError = '';
    } else {
      searchingTarget = true;
      targetError = '';
    }
    try {
      const params = new URLSearchParams({ name: query.trim(), limit: '8', includeGuests: 'true' });
      const res = await fetch(`${apiUrl}/players?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: Player[] = data.data ?? [];
      if (side === 'source') sourceResults = list;
      else targetResults = list;
    } catch {
      if (side === 'source') sourceError = 'Could not search players.';
      else targetError = 'Could not search players.';
    } finally {
      if (side === 'source') searchingSource = false;
      else searchingTarget = false;
    }
  }

  function pickSource(p: Player) {
    selectedSource = p;
    sourceQuery = p.name;
    sourceResults = [];
    confirmed = false;
    mergeError = '';
  }

  function pickTarget(p: Player) {
    selectedTarget = p;
    targetQuery = p.name;
    targetResults = [];
    confirmed = false;
    mergeError = '';
  }

  function clearSource() {
    selectedSource = null;
    sourceQuery = '';
    sourceResults = [];
    confirmed = false;
    mergeError = '';
  }

  function clearTarget() {
    selectedTarget = null;
    targetQuery = '';
    targetResults = [];
    confirmed = false;
    mergeError = '';
  }

  const canConfirm = $derived(
    !!selectedSource && !!selectedTarget && selectedSource._id !== selectedTarget._id
  );

  async function doMerge() {
    if (!selectedSource || !selectedTarget) return;
    merging = true;
    mergeError = '';
    try {
      const res = await fetch(`${apiUrl}/players/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: selectedSource._id, targetId: selectedTarget._id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        mergeError = data.message ?? `Error ${res.status}`;
        return;
      }
      const result = await res.json();
      toast.schedule(
        `Merged "${selectedSource.name}" into "${selectedTarget.name}" (${result.matchesUpdated} match${result.matchesUpdated === 1 ? '' : 'es'} updated).`,
        'success',
      );
      await goto(`/players/${selectedTarget._id}`);
    } catch {
      mergeError = 'Could not reach API.';
    } finally {
      merging = false;
    }
  }
</script>

<div class="page merge-page">
  {#if !authLoaded}
    <p class="muted">Loading…</p>
  {:else if !isAdmin}
    <AppCard className="stack">
      <AppBanner variant="danger" title="Access denied" message="This page is only available to admins." />
      <div style="margin-top: 12px;">
        <AppButton href="/players">Back to players</AppButton>
      </div>
    </AppCard>
  {:else}
    <AppCard className="stack">
      <h2 class="card__title">Merge players</h2>
      <p class="card__sub">
        The <strong>source player</strong> will be deleted. All their match records will be
        re-assigned to the <strong>target player</strong>.
      </p>

      <div class="merge-page__grid">
        <!-- Source -->
        <div class="merge-page__col">
          <p class="merge-page__col-label">Source <span class="muted">(will be deleted)</span></p>
          {#if selectedSource}
            <div class="merge-page__player-chip">
              <span class="merge-page__player-name">{selectedSource.name}</span>
              {#if selectedSource.team}
                <span class="muted merge-page__player-team">{selectedSource.team}</span>
              {/if}
              {#if selectedSource.isGuest}
                <span class="muted merge-page__badge">guest</span>
              {/if}
              <button type="button" class="merge-page__clear-btn" onclick={clearSource} aria-label="Clear source player">✕</button>
            </div>
          {:else}
            <div class="merge-page__search-wrap">
              <input
                type="search"
                class="input"
                placeholder="Search player by name…"
                bind:value={sourceQuery}
                oninput={onSourceInput}
                autocomplete="off"
              />
              {#if searchingSource}
                <p class="muted text-sm" style="margin-top: 4px;">Searching…</p>
              {:else if sourceError}
                <p class="merge-page__search-error">{sourceError}</p>
              {:else if sourceResults.length > 0}
                <ul class="merge-page__results">
                  {#each sourceResults as p (p._id)}
                    <li>
                      <button
                        type="button"
                        class="merge-page__result-btn"
                        onclick={() => pickSource(p)}
                        disabled={selectedTarget?._id === p._id}
                      >
                        <span class="merge-page__player-name">{p.name}</span>
                        {#if p.team}
                          <span class="muted merge-page__player-team">{p.team}</span>
                        {/if}
                        {#if p.isGuest}
                          <span class="muted merge-page__badge">guest</span>
                        {/if}
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else if sourceQuery.trim() && !searchingSource}
                <p class="muted text-sm" style="margin-top: 4px;">No players found.</p>
              {/if}
            </div>
          {/if}
        </div>

        <div class="merge-page__arrow" aria-hidden="true">→</div>

        <!-- Target -->
        <div class="merge-page__col">
          <p class="merge-page__col-label">Target <span class="muted">(will be kept)</span></p>
          {#if selectedTarget}
            <div class="merge-page__player-chip">
              <span class="merge-page__player-name">{selectedTarget.name}</span>
              {#if selectedTarget.team}
                <span class="muted merge-page__player-team">{selectedTarget.team}</span>
              {/if}
              {#if selectedTarget.isGuest}
                <span class="muted merge-page__badge">guest</span>
              {/if}
              <button type="button" class="merge-page__clear-btn" onclick={clearTarget} aria-label="Clear target player">✕</button>
            </div>
          {:else}
            <div class="merge-page__search-wrap">
              <input
                type="search"
                class="input"
                placeholder="Search player by name…"
                bind:value={targetQuery}
                oninput={onTargetInput}
                autocomplete="off"
              />
              {#if searchingTarget}
                <p class="muted text-sm" style="margin-top: 4px;">Searching…</p>
              {:else if targetError}
                <p class="merge-page__search-error">{targetError}</p>
              {:else if targetResults.length > 0}
                <ul class="merge-page__results">
                  {#each targetResults as p (p._id)}
                    <li>
                      <button
                        type="button"
                        class="merge-page__result-btn"
                        onclick={() => pickTarget(p)}
                        disabled={selectedSource?._id === p._id}
                      >
                        <span class="merge-page__player-name">{p.name}</span>
                        {#if p.team}
                          <span class="muted merge-page__player-team">{p.team}</span>
                        {/if}
                        {#if p.isGuest}
                          <span class="muted merge-page__badge">guest</span>
                        {/if}
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else if targetQuery.trim() && !searchingTarget}
                <p class="muted text-sm" style="margin-top: 4px;">No players found.</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      {#if selectedSource && selectedTarget && selectedSource._id === selectedTarget._id}
        <AppBanner variant="warning" message="Source and target must be different players." />
      {/if}

      {#if canConfirm && !confirmed}
        <AppBanner variant="warning">
          {#snippet children()}
            <p class="app-banner__message">
              This will permanently delete <strong>{selectedSource?.name}</strong> and move all
              their matches to <strong>{selectedTarget?.name}</strong>. This cannot be undone.
            </p>
            <div style="margin-top: 10px;">
              <AppButton variant="primary" onclick={() => (confirmed = true)}>
                I understand — confirm merge
              </AppButton>
            </div>
          {/snippet}
        </AppBanner>
      {/if}

      {#if mergeError}
        <AppBanner variant="danger" message={mergeError} />
      {/if}

      {#if confirmed && canConfirm}
        <div class="row" style="margin-top: 4px; gap: 12px;">
          <AppButton variant="primary" disabled={merging} onclick={doMerge}>
            {merging ? 'Merging…' : 'Merge players'}
          </AppButton>
          <AppButton onclick={() => (confirmed = false)} disabled={merging}>Cancel</AppButton>
        </div>
      {/if}

      <div style="margin-top: 16px;">
        <AppButton href="/players">Back to players</AppButton>
      </div>
    </AppCard>
  {/if}
</div>

<style>
  .merge-page {
    max-width: 760px;
  }

  .merge-page__grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-md);
    align-items: start;
    margin-top: var(--space-md);
  }

  @media (max-width: 560px) {
    .merge-page__grid {
      grid-template-columns: 1fr;
    }

    .merge-page__arrow {
      display: none;
    }
  }

  .merge-page__col-label {
    font-weight: 700;
    margin: 0 0 8px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .merge-page__arrow {
    align-self: center;
    font-size: 1.4rem;
    color: var(--muted);
    padding-top: 28px;
  }

  .merge-page__player-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--glass-bg);
    flex-wrap: wrap;
  }

  .merge-page__player-name {
    font-weight: 600;
  }

  .merge-page__player-team {
    font-size: 0.82rem;
  }

  .merge-page__badge {
    font-size: 0.75rem;
    padding: 1px 6px;
    border-radius: 99px;
    border: 1px solid var(--border);
  }

  .merge-page__clear-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1;
    padding: 2px 4px;
  }

  .merge-page__clear-btn:hover {
    color: var(--fg);
  }

  .merge-page__search-wrap {
    position: relative;
  }

  .merge-page__results {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg);
  }

  .merge-page__result-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    color: var(--fg);
    flex-wrap: wrap;
  }

  .merge-page__result-btn:hover:not(:disabled) {
    background: var(--glass-bg);
  }

  .merge-page__result-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .merge-page__results li + li {
    border-top: 1px solid var(--border);
  }

  .merge-page__search-error {
    color: var(--danger, #dc2626);
    font-size: 0.82rem;
    margin: 4px 0 0;
  }
</style>
