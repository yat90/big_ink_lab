<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { config } from '$lib/config';
  import type { LorcanaMatch, LorcanaMatchPlayer } from '$lib/lorcana-match';
  import {
    formatMatchRoundLabel,
    getLorcanaMatchPlayerId,
    getMatchRoundKey,
    matchStageOrTournamentLabel,
  } from '$lib/lorcana-match';
  import FilterCard from '$lib/FilterCard.svelte';
  import InkIcons from '$lib/InkIcons.svelte';
  import IconCrown from '$lib/icons/IconCrown.svelte';

  type Player = { _id: string; name: string; team?: string };

  type TournamentDetail = {
    _id: string;
    name: string;
    date: string;
    location?: string;
    url?: string;
    meta?: string;
    matchCount: number;
    latestPlayedAt: string | null;
  };

  const PAGE_SIZE = 100;
  const MAX_PAGES = 30;

  const apiUrl = config.apiUrl ?? '/api';

  const tournamentId = $derived($page.params.id ?? '');

  let tournament = $state<TournamentDetail | null>(null);
  let matches = $state<LorcanaMatch[]>([]);
  let loading = $state(true);
  let detailError = $state('');
  let matchesError = $state('');
  let total = $state(0);
  let listTruncated = $state(false);

  let editing = $state(false);
  let editName = $state('');
  let editDate = $state('');
  let editLocation = $state('');
  let editUrl = $state('');
  let editMeta = $state('');
  let saveError = $state('');
  let deleteError = $state('');
  let saving = $state(false);
  let deleting = $state(false);
  let showDeleteConfirm = $state(false);

  type ViewTab = 'rounds' | 'players';
  /** Rounds tab: `all`, unassigned (`none`), or a round label (e.g. "1", "top 8"). */
  type RoundFilter = 'all' | 'none' | string;

  let activeView = $state<ViewTab>('rounds');
  let roundFilter = $state<RoundFilter>('all');
  let playerFilterId = $state('');

  /** Collapsible filter card (shared pattern with /matches, /decks). */
  let filtersExpanded = $state(false);

  function compareRoundKeys(a: string, b: string): number {
    const na = Number(a);
    const nb = Number(b);
    if (/^\d+$/.test(a) && /^\d+$/.test(b) && Number.isFinite(na) && Number.isFinite(nb)) {
      return na - nb;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  const roundNumbers = $derived.by(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const k = getMatchRoundKey(m.round);
      if (k != null) set.add(k);
    }
    return [...set].sort(compareRoundKeys);
  });

  const hasUnassignedRound = $derived.by(() => matches.some((m) => getMatchRoundKey(m.round) == null));

  /** Players who appear as p1 (left) in at least one loaded match — used for the Players tab filter only. */
  const tournamentPlayers = $derived.by(() => {
    const map = new Map<string, string>();
    for (const m of matches) {
      const id1 = getLorcanaMatchPlayerId(m.p1);
      if (id1) map.set(id1, playerName(m.p1));
    }
    return [...map.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
    );
  });

  const displayedMatches = $derived.by(() => {
    if (activeView === 'rounds') {
      if (roundFilter === 'all') return matches;
      if (roundFilter === 'none') {
        return matches.filter((m) => getMatchRoundKey(m.round) == null);
      }
      return matches.filter((m) => getMatchRoundKey(m.round) === roundFilter);
    }
    if (!playerFilterId.trim()) return matches;
    const pid = playerFilterId.trim();
    return matches.filter((m) => getLorcanaMatchPlayerId(m.p1) === pid);
  });

  const tournamentFilterSummary = $derived(
    `${displayedMatches.length} of ${matches.length} shown`,
  );

  const tournamentFilterBadges = $derived.by(() => {
    const badges: string[] = [];
    if (activeView === 'rounds') {
      if (roundFilter === 'none') badges.push('Round: No round');
      else if (roundFilter !== 'all') badges.push(`Round: ${formatMatchRoundLabel(roundFilter)}`);
    } else if (playerFilterId.trim()) {
      const pair = tournamentPlayers.find(([id]) => id === playerFilterId.trim());
      if (pair) badges.push(`P1: ${pair[1]}`);
    }
    return badges;
  });

  const canClearTournamentFilters = $derived(
    activeView === 'rounds' ? roundFilter !== 'all' : !!playerFilterId.trim(),
  );

  function clearTournamentViewFilters(): void {
    if (activeView === 'rounds') roundFilter = 'all';
    else playerFilterId = '';
  }

  function playerName(p: Player | LorcanaMatchPlayer | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : (p.name ?? '–');
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  function matchWinnerId(m: LorcanaMatch): string | undefined {
    const w = m.matchWinner;
    if (!w) return undefined;
    return typeof w === 'object' && w !== null ? w._id : w;
  }

  function gameWinnerId(g: { winner?: unknown }): string | undefined {
    const w = g.winner;
    if (w == null) return undefined;
    return typeof w === 'object' && w !== null && '_id' in w
      ? (w as { _id: string })._id
      : String(w);
  }

  function gamesWon(match: LorcanaMatch, playerId: string): number {
    const games = match.games ?? [];
    return games.filter((g) => gameWinnerId(g) === playerId).length;
  }

  function toDateInput(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  function syncEditFormFromTournament(): void {
    if (!tournament) return;
    editName = tournament.name;
    editDate = toDateInput(tournament.date);
    editLocation = tournament.location?.trim() ?? '';
    editUrl = tournament.url?.trim() ?? '';
    editMeta = tournament.meta?.trim() ?? '';
  }

  function beginEdit(): void {
    deleteError = '';
    saveError = '';
    syncEditFormFromTournament();
    editing = true;
  }

  function cancelEdit(): void {
    saveError = '';
    syncEditFormFromTournament();
    editing = false;
  }

  function apiErrorMessage(data: unknown, fallback: string): string {
    const d = data as { message?: string | string[] };
    const m = d?.message;
    if (Array.isArray(m)) return m.filter(Boolean).join(', ') || fallback;
    if (typeof m === 'string' && m.trim()) return m;
    return fallback;
  }

  async function saveTournament(e: Event): Promise<void> {
    e.preventDefault();
    saveError = '';
    if (!editName.trim() || !editDate.trim()) {
      saveError = 'Name and date are required.';
      return;
    }
    saving = true;
    try {
      const dateIso = `${editDate.trim()}T12:00:00.000Z`;
      const res = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          date: dateIso,
          location: editLocation.trim(),
          url: editUrl.trim(),
          meta: editMeta.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        saveError = apiErrorMessage(data, `Could not save (${res.status})`);
        return;
      }
      const row = data as Record<string, unknown>;
      const idRaw = row._id;
      const id =
        typeof idRaw === 'string'
          ? idRaw
          : idRaw && typeof (idRaw as { toString?: () => string }).toString === 'function'
            ? (idRaw as { toString: () => string }).toString()
            : (tournament?._id ?? tournamentId);
      const dateRaw = row.date;
      const dateStr =
        typeof dateRaw === 'string'
          ? dateRaw
          : dateRaw instanceof Date
            ? dateRaw.toISOString()
            : String(dateRaw ?? '');
      tournament = {
        _id: id,
        name: String(row.name ?? ''),
        date: dateStr,
        location: row.location != null ? String(row.location) : undefined,
        url: row.url != null ? String(row.url) : undefined,
        meta: row.meta != null ? String(row.meta) : undefined,
        matchCount:
          row.matchCount != null && !Number.isNaN(Number(row.matchCount))
            ? Number(row.matchCount)
            : (tournament?.matchCount ?? 0),
        latestPlayedAt:
          row.latestPlayedAt != null
            ? typeof row.latestPlayedAt === 'string'
              ? row.latestPlayedAt
              : String(row.latestPlayedAt)
            : (tournament?.latestPlayedAt ?? null),
      };
      editing = false;
    } catch {
      saveError = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }

  function openDeleteConfirm(): void {
    deleteError = '';
    showDeleteConfirm = true;
  }

  function closeDeleteConfirm(): void {
    if (deleting) return;
    showDeleteConfirm = false;
  }

  async function confirmDeleteTournament(): Promise<void> {
    deleteError = '';
    deleting = true;
    try {
      const res = await fetch(`${apiUrl}/tournaments/${tournamentId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        deleteError = apiErrorMessage(
          data,
          'Cannot delete while matches are linked. Unlink or reassign them first.',
        );
        showDeleteConfirm = false;
        return;
      }
      if (!res.ok) {
        deleteError = apiErrorMessage(data, `Could not delete (${res.status})`);
        showDeleteConfirm = false;
        return;
      }
      showDeleteConfirm = false;
      await goto('/tournaments');
    } catch {
      deleteError = 'Could not reach API.';
      showDeleteConfirm = false;
    } finally {
      deleting = false;
    }
  }

  $effect(() => {
    if (!showDeleteConfirm || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDeleteConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function sortMatches(rows: LorcanaMatch[]): LorcanaMatch[] {
    return [...rows].sort((a, b) => {
      const ka = getMatchRoundKey(a.round);
      const kb = getMatchRoundKey(b.round);
      if (ka !== kb) {
        if (ka == null) return 1;
        if (kb == null) return -1;
        const c = compareRoundKeys(ka, kb);
        if (c !== 0) return c;
      }
      const ta = a.playedAt ? new Date(a.playedAt).getTime() : 0;
      const tb = b.playedAt ? new Date(b.playedAt).getTime() : 0;
      return ta - tb;
    });
  }

  $effect(() => {
    const id = tournamentId;
    if (!id) return;
    let cancelled = false;
    loading = true;
    detailError = '';
    matchesError = '';
    void (async () => {
      try {
        const dRes = await fetch(`${apiUrl}/tournaments/${id}`);
        if (!dRes.ok) {
          if (!cancelled) {
            detailError =
              dRes.status === 404 ? 'Tournament not found.' : 'Failed to load tournament.';
            loading = false;
          }
          return;
        }
        const d = (await dRes.json()) as TournamentDetail;
        if (cancelled) return;
        tournament = d;
      } catch {
        if (!cancelled) {
          detailError = 'Could not reach API.';
          loading = false;
        }
        return;
      }
      if (cancelled) return;
      try {
        const aggregated: LorcanaMatch[] = [];
        let fullTotal = 0;
        let pages = 0;
        let totalPages = 1;
        while (pages < MAX_PAGES && pages < totalPages) {
          pages += 1;
          const params = new URLSearchParams();
          params.set('tournamentId', id);
          params.set('sort', 'oldest');
          params.set('page', String(pages));
          params.set('limit', String(PAGE_SIZE));
          const res = await fetch(`${apiUrl}/matches?${params}`);
          if (!res.ok) {
            if (!cancelled) matchesError = 'Failed to load matches';
            return;
          }
          const response = await res.json();
          const chunk: LorcanaMatch[] = response.data || [];
          fullTotal = response.meta?.total ?? fullTotal;
          totalPages = response.meta?.totalPages ?? 1;
          aggregated.push(...chunk);
          if (chunk.length === 0) break;
        }
        if (cancelled) return;
        matches = sortMatches(aggregated);
        total = fullTotal > 0 ? fullTotal : aggregated.length;
        listTruncated = aggregated.length < total;
      } catch {
        if (!cancelled) matchesError = 'Could not reach API.';
      } finally {
        if (!cancelled) loading = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<svelte:head>
  <title>{tournament?.name ?? 'Tournament'} · Big Ink Lab</title>
</svelte:head>

<div class="page tournament-detail-page">
  <nav class="tournament-detail__crumb muted" aria-label="Breadcrumb">
    <a href="/tournaments">Tournaments</a>
    <span aria-hidden="true"> / </span>
    <span class="tournament-detail__crumb-current">{tournament?.name ?? '…'}</span>
  </nav>

  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading…</p>
    </div>
  {:else if detailError}
    <div class="card" role="alert">
      <p class="alert">{detailError}</p>
      <a href="/tournaments" class="btn" style="margin-top: var(--space-sm);">Back to tournaments</a>
    </div>
  {:else if tournament}
    <section class="card stack tournament-detail__summary" aria-labelledby="tournament-detail-title">
      <h1 id="tournament-detail-title" class="page-title tournament-detail__title">
        {editing ? (editName.trim() || '…') : tournament.name}
      </h1>

      {#if editing}
        <form class="stack tournament-detail__edit-form" onsubmit={saveTournament}>
          <label class="label" for="td-edit-name">Name</label>
          <input id="td-edit-name" class="input" bind:value={editName} autocomplete="off" required />

          <label class="label" for="td-edit-date">Date</label>
          <input id="td-edit-date" type="date" class="input" bind:value={editDate} required />

          <label class="label" for="td-edit-loc">Location</label>
          <input id="td-edit-loc" class="input" bind:value={editLocation} placeholder="Optional" />

          <label class="label" for="td-edit-url">URL</label>
          <input
            id="td-edit-url"
            class="input"
            bind:value={editUrl}
            placeholder="PlayHub Link, Melee Link,..."
          />

          <label class="label" for="td-edit-meta">Meta</label>
          <input
            id="td-edit-meta"
            class="input"
            bind:value={editMeta}
            placeholder="Optional (e.g. Set 11, Set 12, Infinity)"
            maxlength="120"
          />

          {#if saveError}
            <p class="alert" role="alert">{saveError}</p>
          {/if}

          <div class="row tournament-detail__edit-actions">
            <button type="submit" class="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" class="btn" onclick={cancelEdit} disabled={saving}>Cancel</button>
          </div>
        </form>
      {:else}
        <ul class="tournament-detail__facts muted">
          <li><strong>Date</strong> {formatDate(tournament.date)}</li>
          {#if tournament.meta?.trim()}
            <li><strong>Meta</strong> {tournament.meta.trim()}</li>
          {/if}
          {#if tournament.location?.trim()}
            {@const loc = tournament.location.trim()}
            <li>
              <strong>Location</strong>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`}
                class="tournament-detail__url"
                target="_blank"
                rel="noopener noreferrer"
              >{loc}</a>
            </li>
          {/if}
          {#if tournament.url?.trim()}
            <li>
              <strong>Link</strong>
              <a href={tournament.url.trim()} class="tournament-detail__url" target="_blank" rel="noopener noreferrer">
                {tournament.url.trim()}
              </a>
            </li>
          {/if}
          <li>
            <strong>Matches</strong> {total} linked
          </li>
        </ul>
      {/if}
    </section>

    <div class="row tournament-detail__actions">
      <a href="/tournaments/results?tournamentId={tournamentId}" class="btn btn--primary">Add results</a>
      <a href="/matches?tournamentId={tournamentId}&stage=Tournament" class="btn">Open in Matches</a>
      {#if !editing}
        <button type="button" class="btn" onclick={beginEdit}>Edit</button>
        <button
          type="button"
          class="btn btn--danger"
          onclick={openDeleteConfirm}
          disabled={deleting || showDeleteConfirm}
        >
          Delete
        </button>
      {/if}
    </div>

    {#if deleteError}
      <p class="alert tournament-detail__delete-error" role="alert">{deleteError}</p>
    {/if}

    {#if matchesError}
      <div class="card" role="alert">
        <p class="alert">{matchesError}</p>
      </div>
    {:else if matches.length === 0}
      <div class="card stack">
        <p class="card__sub" style="margin: 0;">No matches linked to this tournament yet.</p>
      </div>
    {:else}
      {#if listTruncated}
        <p class="muted tournament-detail__truncated" role="status">
          Loaded {matches.length} of {total} matches (cap {MAX_PAGES * PAGE_SIZE}). Open
          <a href="/matches?tournamentId={tournamentId}&stage=Tournament">Matches</a>
          for paging and filters.
        </p>
      {/if}

      <div class="app-tabs" role="tablist" aria-label="Match browsing">
        <button
          type="button"
          role="tab"
          id="tab-tournament-rounds"
          aria-controls="panel-tournament-rounds"
          aria-selected={activeView === 'rounds'}
          class="app-tabs__tab"
          class:app-tabs__tab--active={activeView === 'rounds'}
          onclick={() => (activeView = 'rounds')}
        >
          Rounds
        </button>
        <button
          type="button"
          role="tab"
          id="tab-tournament-players"
          aria-controls="panel-tournament-players"
          aria-selected={activeView === 'players'}
          class="app-tabs__tab"
          class:app-tabs__tab--active={activeView === 'players'}
          onclick={() => (activeView = 'players')}
        >
          Players
        </button>
      </div>

      {#if activeView === 'rounds'}
        <div
          id="panel-tournament-rounds"
          role="tabpanel"
          aria-labelledby="tab-tournament-rounds"
        >
          <div class="tournament-detail__filters">
            <FilterCard
              bind:expanded={filtersExpanded}
              summary={tournamentFilterSummary}
              badges={tournamentFilterBadges}
              panelId="tournament-detail-round-filters"
              onClear={clearTournamentViewFilters}
              canClear={canClearTournamentFilters}
            >
              <div class="stack" style="gap: 0.5rem;">
                <span class="tournament-detail__filters-label muted">Round</span>
                <div class="tournament-detail__chips" aria-label="Filter by round">
                  <button
                    type="button"
                    class="tournament-detail__chip"
                    class:tournament-detail__chip--active={roundFilter === 'all'}
                    onclick={() => (roundFilter = 'all')}
                  >
                    All
                  </button>
                  {#if hasUnassignedRound}
                    <button
                      type="button"
                      class="tournament-detail__chip"
                      class:tournament-detail__chip--active={roundFilter === 'none'}
                      onclick={() => (roundFilter = 'none')}
                    >
                      No round
                    </button>
                  {/if}
                  {#each roundNumbers as r (r)}
                    <button
                      type="button"
                      class="tournament-detail__chip"
                      class:tournament-detail__chip--active={roundFilter === r}
                      onclick={() => (roundFilter = r)}
                    >
                      {formatMatchRoundLabel(r)}
                    </button>
                  {/each}
                </div>
              </div>
              <div class="filters__footer">
                <button
                  type="button"
                  class="btn"
                  onclick={clearTournamentViewFilters}
                  disabled={!canClearTournamentFilters}
                >
                  Clear filters
                </button>
              </div>
            </FilterCard>
          </div>
        </div>
      {:else}
        <div
          id="panel-tournament-players"
          role="tabpanel"
          aria-labelledby="tab-tournament-players"
        >
          <div class="tournament-detail__filters">
            <FilterCard
              bind:expanded={filtersExpanded}
              summary={tournamentFilterSummary}
              badges={tournamentFilterBadges}
              panelId="tournament-detail-player-filters"
              onClear={clearTournamentViewFilters}
              canClear={canClearTournamentFilters}
            >
              <label class="label tournament-detail__filters-label" for="tournament-player-filter"
                >Player 1</label
              >
              <select
                id="tournament-player-filter"
                class="input"
                bind:value={playerFilterId}
                aria-label="Filter matches by player 1 (left seat)"
              >
                <option value="">All matches</option>
                {#each tournamentPlayers as [pid, label] (pid)}
                  <option value={pid}>{label}</option>
                {/each}
              </select>
              <div class="filters__footer">
                <button
                  type="button"
                  class="btn"
                  onclick={clearTournamentViewFilters}
                  disabled={!canClearTournamentFilters}
                >
                  Clear filters
                </button>
              </div>
            </FilterCard>
          </div>
        </div>
      {/if}

      {#if displayedMatches.length === 0}
        <div class="card stack">
          <p class="card__sub" style="margin: 0;">
            No matches for this filter. Try another round or player 1.
          </p>
        </div>
      {:else}
        <div class="stack">
          {#each displayedMatches as match (match._id)}
            {@const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1}
            {@const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2}
            {@const winnerId = matchWinnerId(match)}
            <a
              href="/matches/{match._id}"
              class="card playercard matchcard"
              style="text-decoration: none; color: inherit;"
            >
              <div class="matchcard__top muted">
                {formatDate(match.playedAt)} · {matchStageOrTournamentLabel(match)}{#if getMatchRoundKey(match.round) != null}
                  · {formatMatchRoundLabel(match.round)}{/if}
              </div>
              <div class="matchcard__row">
                <div
                  class="matchcard__player matchcard__player--left"
                  class:matchcard__player--winner={winnerId === p1Id}
                >
                  <span class="matchcard__name">
                    {playerName(match.p1)}
                    {#if winnerId === p1Id}
                      <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">
                        <IconCrown size={16} />
                      </span>
                    {/if}
                  </span>
                  {#if match.p1DeckColor}
                    <span class="matchcard__ink" title={match.p1DeckColor} aria-hidden="true">
                      <InkIcons deckColor={match.p1DeckColor} />
                    </span>
                  {/if}
                  <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p1Id ?? '')}</span>
                </div>
                <div class="matchcard__vs" aria-hidden="true">VS.</div>
                <div
                  class="matchcard__player matchcard__player--right"
                  class:matchcard__player--winner={winnerId === p2Id}
                >
                  <span class="matchcard__wins muted" title="Games won">{gamesWon(match, p2Id ?? '')}</span>
                  {#if match.p2DeckColor}
                    <span class="matchcard__ink" title={match.p2DeckColor} aria-hidden="true">
                      <InkIcons deckColor={match.p2DeckColor} />
                    </span>
                  {/if}
                  <span class="matchcard__name">
                    {playerName(match.p2)}
                    {#if winnerId === p2Id}
                      <span class="matchcard__badge matchcard__badge--winner" aria-label="Winner">
                        <IconCrown size={16} />
                      </span>
                    {/if}
                  </span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}

  {#if showDeleteConfirm}
    <div
      class="tournament-detail__delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tournament-delete-title"
    >
      <button
        type="button"
        class="tournament-detail__delete-modal-backdrop"
        aria-label="Cancel"
        onclick={closeDeleteConfirm}
        disabled={deleting}
      ></button>
      <div class="tournament-detail__delete-modal-card card">
        <h2 id="tournament-delete-title" class="tournament-detail__delete-modal-title">
          Delete tournament?
        </h2>
        <p class="tournament-detail__delete-modal-text muted">
          Are you sure you want to delete <strong>{tournament?.name ?? 'this tournament'}</strong>? This cannot be
          undone. You can only delete if no matches are linked.
        </p>
        <div class="tournament-detail__delete-modal-actions row">
          <button type="button" class="btn btn--danger" onclick={confirmDeleteTournament} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button type="button" class="btn" onclick={closeDeleteConfirm} disabled={deleting}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tournament-detail-page {
    max-width: 720px;
  }
  .tournament-detail__crumb {
    margin: 0 0 var(--space-sm, 0.5rem) 0;
    font-size: 0.875rem;
  }
  .tournament-detail__crumb a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .tournament-detail__crumb-current {
    word-break: break-word;
  }
  .tournament-detail__summary {
    margin-bottom: var(--space-md, 1rem);
    gap: 0.65rem;
  }
  .page-title,
  .tournament-detail__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    word-break: break-word;
  }
  .tournament-detail__facts {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  .tournament-detail__facts li {
    margin-bottom: 0.25rem;
  }
  .tournament-detail__url {
    color: inherit;
    word-break: break-all;
  }
  .tournament-detail__actions {
    margin-bottom: var(--space-md, 1rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournament-detail__edit-form {
    margin: 0;
    gap: 0.65rem;
  }
  .tournament-detail__edit-actions {
    margin-top: var(--space-sm, 0.5rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournament-detail__delete-error {
    margin: 0 0 var(--space-md, 1rem) 0;
  }
  .tournament-detail__truncated {
    margin: 0 0 var(--space-md, 1rem) 0;
    font-size: 0.875rem;
    line-height: 1.45;
  }
  .tournament-detail__truncated a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .tournament-detail__filters {
    margin-bottom: var(--space-md, 1rem);
    gap: 0.5rem;
  }
  .tournament-detail__filters-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .tournament-detail__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .tournament-detail__chip {
    padding: 0.35rem 0.65rem;
    border: 1px solid color-mix(in srgb, var(--color-fg, #111) 18%, transparent);
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    color: inherit;
    background: transparent;
  }
  .tournament-detail__chip:hover {
    border-color: color-mix(in srgb, var(--color-fg, #111) 35%, transparent);
  }
  .tournament-detail__chip--active {
    border-color: var(--color-accent, #3b82f6);
    background: color-mix(in srgb, var(--color-accent, #3b82f6) 12%, transparent);
  }

  .tournament-detail__delete-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .tournament-detail__delete-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .tournament-detail__delete-modal-backdrop:disabled {
    cursor: not-allowed;
  }
  .tournament-detail__delete-modal-card {
    position: relative;
    z-index: 1;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }
  .tournament-detail__delete-modal-title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }
  .tournament-detail__delete-modal-text {
    margin: 0 0 20px;
    line-height: 1.45;
  }
  .tournament-detail__delete-modal-actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
