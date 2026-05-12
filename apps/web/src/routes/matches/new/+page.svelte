<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';
  import DeckColorSelect from '$lib/components/deck/DeckColorSelect.svelte';
  import DeckPickerModal from '$lib/components/deck/DeckPickerModal.svelte';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import TournamentPickerModal from '$lib/components/match/TournamentPickerModal.svelte';
  import { authMe } from '$lib/me';
  import { STAGE_OPTIONS } from '$lib/matches';
  import { onMount } from 'svelte';
  import { getLocale, translate, t, locale } from '$lib/i18n';
  import { get } from 'svelte/store';

  type Player = { _id: string; name: string; team: string };

  type TournamentPick = { _id: string; name: string; date: string };

  let players = $state<Player[]>([]);
  let p1 = $state('');
  let p2 = $state('');
  let p2NameFilter = $state('');
  let p2Candidates = $state<Player[]>([]);
  let p2ListLoading = $state(false);
  let p2ListError = $state('');
  let p2ListGen = 0;
  /** Opponent suggestions (list / loading / empty / create) only while the filter field is focused. */
  let p2FilterFocused = $state(false);
  let p2BlurCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let p1DeckId = $state('');
  let p2DeckId = $state('');
  let p1DeckDisplayName = $state('');
  let p2DeckDisplayName = $state('');
  let deckPickerOpen = $state(false);
  let deckPickerRole = $state<'p1' | 'p2'>('p1');
  let stage = $state('Casual');
  function nowForDatetimeLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function isoToDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return nowForDatetimeLocal();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  let playedAt = $state(nowForDatetimeLocal());
  let round = $state('');
  let tournaments = $state<TournamentPick[]>([]);
  let tournamentId = $state('');
  let tournamentsLoading = $state(false);
  let tournamentsError = $state('');
  let tournamentPickerOpen = $state(false);
  let p1DeckColor = $state('');
  let p2DeckColor = $state('');
  let loading = $state(false);
  let error = $state('');

  let createGuestLoading = $state(false);
  let createGuestError = $state('');

  const showP2CreateGuest = $derived(
    p2FilterFocused &&
      !!p1.trim() &&
      !p2ListLoading &&
      p2Candidates.length === 0 &&
      p2NameFilter.trim().length > 0,
  );

  const apiUrl = config.apiUrl ?? '/api';

  const BIG_INK_TEAM = 'The Big Ink Theory';

  let p1Team = $state('');
  let myPlayerName = $state('');

  function getPlayerTeam(playerId: string): string {
    return (players.find((pl) => pl._id === playerId)?.team ?? '').trim();
  }
  const showP1DeckSelect = $derived(!!p1 && p1Team === BIG_INK_TEAM);
  const showP2DeckSelect = $derived(!!p2 && getPlayerTeam(p2) === BIG_INK_TEAM);

  const p1PlayerDisplayName = $derived.by(() => {
    void get(locale);
    return myPlayerName.trim() || translate(get(locale), 'matches.new.you');
  });
  const p2PlayerDisplayName = $derived.by(() => {
    void get(locale);
    return p2
      ? (players.find((pl) => pl._id === p2)?.name ??
          translate(get(locale), 'matches.new.player2Default'))
      : translate(get(locale), 'matches.new.player2Default');
  });

  async function fetchDeck(deckId: string): Promise<{ name: string; deckColor: string } | null> {
    if (!deckId.trim()) return null;
    try {
      const res = await fetch(`${apiUrl}/decks/${deckId}`);
      if (res.ok) {
        const deck = await res.json();
        return {
          name: deck?.name ?? '',
          deckColor: (deck?.deckColor ?? '').trim(),
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function mergePlayers(rows: Player[]) {
    const byId: Record<string, Player> = {};
    for (const p of players) byId[p._id] = p;
    for (const r of rows) {
      byId[r._id] = {
        _id: r._id,
        name: r.name,
        team: (r.team ?? '').trim(),
      };
    }
    players = Object.values(byId);
  }

  function selectP2FromList(pl: Player) {
    if (pl._id === p1) return;
    p2 = pl._id;
    p2NameFilter = pl.name;
    createGuestError = '';
    mergePlayers([pl]);
    if (p2BlurCloseTimer) {
      clearTimeout(p2BlurCloseTimer);
      p2BlurCloseTimer = null;
    }
    p2FilterFocused = false;
  }

  async function loadP2Candidates() {
    const gen = ++p2ListGen;
    if (!p1.trim()) {
      p2Candidates = [];
      p2ListLoading = false;
      p2ListError = '';
      return;
    }
    p2ListLoading = true;
    p2ListError = '';
    createGuestError = '';
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '3',
        includeGuests: 'true',
      });
      const q = p2NameFilter.trim();
      if (q) params.set('name', q);
      const res = await fetch(`${apiUrl}/players?${params}`);
      if (!res.ok) {
        if (gen === p2ListGen) {
          p2Candidates = [];
          p2ListError = translate(getLocale(), 'matches.new.searchHintFailed');
        }
        return;
      }
      const json = await res.json();
      if (gen !== p2ListGen) return;
      const rows: Player[] = (json?.data ?? []).map((r: Player) => ({
        _id: r._id,
        name: r.name,
        team: (r.team ?? '').trim(),
      }));
      const rowsNoSelf = rows.filter((r) => r._id !== p1);
      p2Candidates = rowsNoSelf;
      mergePlayers(rowsNoSelf);
    } catch {
      if (gen === p2ListGen) {
        p2Candidates = [];
        p2ListError = translate(getLocale(), 'common.apiUnreachable');
      }
    } finally {
      if (gen === p2ListGen) p2ListLoading = false;
    }
  }

  async function createGuestOpponent() {
    const name = p2NameFilter.trim();
    if (!name) return;
    createGuestError = '';
    createGuestLoading = true;
    try {
      const res = await fetch(`${apiUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, team: '', isGuest: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        createGuestError =
          (typeof data.message === 'string' ? data.message : null) ??
          translate(getLocale(), 'matches.new.createPlayerFailed', { status: String(res.status) });
        return;
      }
      const created = await res.json();
      const id = String(created._id ?? '');
      const createdName = String(created.name ?? name).trim();
      const team = String(created.team ?? '').trim();
      mergePlayers([{ _id: id, name: createdName, team }]);
      p2 = id;
      p2NameFilter = createdName;
      if (p2BlurCloseTimer) {
        clearTimeout(p2BlurCloseTimer);
        p2BlurCloseTimer = null;
      }
      p2FilterFocused = false;
      void loadP2Candidates();
    } catch {
      createGuestError = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      createGuestLoading = false;
    }
  }

  function onP2FilterFocus() {
    if (p2BlurCloseTimer) {
      clearTimeout(p2BlurCloseTimer);
      p2BlurCloseTimer = null;
    }
    p2FilterFocused = true;
  }

  function onP2FilterBlur() {
    p2BlurCloseTimer = setTimeout(() => {
      p2BlurCloseTimer = null;
      p2FilterFocused = false;
    }, 120);
  }

  /** Keep focus on the input when choosing a row (blur would fire before click otherwise). */
  function onP2SuggestionsMouseDown(e: MouseEvent) {
    e.preventDefault();
  }

  let p2ListDebounce: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    void p1;
    void p2NameFilter;
    void p2FilterFocused;
    if (!p2FilterFocused) {
      if (p2ListDebounce) {
        clearTimeout(p2ListDebounce);
        p2ListDebounce = null;
      }
      return;
    }
    if (p2ListDebounce) {
      clearTimeout(p2ListDebounce);
      p2ListDebounce = null;
    }
    p2ListDebounce = setTimeout(() => {
      p2ListDebounce = null;
      void loadP2Candidates();
    }, 300);
    return () => {
      if (p2ListDebounce) clearTimeout(p2ListDebounce);
    };
  });

  function openDeckPicker(role: 'p1' | 'p2') {
    deckPickerRole = role;
    deckPickerOpen = true;
  }

  async function handleDeckSelect(deckId: string) {
    const deck = deckId.trim() ? await fetchDeck(deckId) : null;
    if (deckPickerRole === 'p1') {
      p1DeckId = deckId;
      p1DeckDisplayName = deck?.name ?? '';
      if (deck?.deckColor) p1DeckColor = deck.deckColor;
      else if (!deckId.trim()) p1DeckColor = '';
    } else {
      p2DeckId = deckId;
      p2DeckDisplayName = deck?.name ?? '';
      if (deck?.deckColor) p2DeckColor = deck.deckColor;
      else if (!deckId.trim()) p2DeckColor = '';
    }
    deckPickerOpen = false;
  }

  const p1DeckButtonLabel = $derived(p1DeckDisplayName || '—');
  const p2DeckButtonLabel = $derived(p2DeckDisplayName || '—');

  $effect(() => {
    if (p1 && p2 === p1) {
      p2 = '';
    }
  });

  async function ensureTournamentsLoaded() {
    if (tournamentsLoading || tournaments.length > 0) return;
    tournamentsError = '';
    tournamentsLoading = true;
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      const res = await fetch(`${apiUrl}/tournaments?${params}`);
      if (!res.ok) {
        tournamentsError = translate(getLocale(), 'matches.new.tournamentsLoadError');
        return;
      }
      const json = await res.json();
      const data: unknown[] = Array.isArray(json) ? json : (json?.data ?? []);
      tournaments = data.map((row) => {
        const r = row as Record<string, unknown>;
        const id = String(r._id ?? '');
        const name = String(r.name ?? 'Tournament');
        let dateStr = '';
        const raw = r.date;
        if (typeof raw === 'string') dateStr = raw;
        else if (raw instanceof Date) dateStr = raw.toISOString();
        else if (raw != null) dateStr = new Date(String(raw)).toISOString();
        return { _id: id, name, date: dateStr || new Date(0).toISOString() };
      });
    } catch {
      tournamentsError = translate(getLocale(), 'matches.new.tournamentsLoadError');
    } finally {
      tournamentsLoading = false;
    }
  }

  function formatTournamentOptionLabel(t: TournamentPick): string {
    if (!t.date) return t.name;
    try {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return t.name;
      const short = d.toLocaleDateString(undefined, { dateStyle: 'medium' });
      return `${t.name} (${short})`;
    } catch {
      return t.name;
    }
  }

  function handleTournamentPickerSelect(id: string) {
    tournamentId = id;
    const t = tournaments.find((x) => x._id === id);
    if (t?.date) playedAt = isoToDatetimeLocal(t.date);
  }

  const tournamentButtonLabel = $derived.by(() => {
    const loc = get(locale);
    if (tournamentsLoading) return translate(loc, 'matches.new.loadingShort');
    if (!tournamentId.trim()) return translate(loc, 'matches.new.tournamentSelectOptional');
    const t = tournaments.find((x) => x._id === tournamentId);
    return t
      ? formatTournamentOptionLabel(t)
      : translate(loc, 'matches.new.tournamentSelectOptional');
  });

  $effect(() => {
    if (stage !== 'Tournament') {
      tournamentId = '';
      tournamentPickerOpen = false;
      return;
    }
    if (!browser) return;
    void ensureTournamentsLoaded();
  });

  onMount(() => {
    return authMe.subscribe((me) => {
      if (me?.player?._id) p1 = me.player._id;
      else p1 = '';
      p1Team = (me?.player?.team ?? '').trim();
      myPlayerName = (me?.player?.name ?? '').trim();
    });
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    if (!p1?.trim()) {
      error = translate(getLocale(), 'matches.new.errNoLinkedPlayer');
      return;
    }
    if (!p2?.trim()) {
      error = translate(getLocale(), 'matches.new.errNoOpponent');
      return;
    }
    if (p2 === p1) {
      error = translate(getLocale(), 'matches.new.errOpponentSelf');
      return;
    }
    loading = true;
    try {
      const body: Record<string, unknown> = {
        p1,
        p2,
        stage,
        playedAt: playedAt ? new Date(playedAt).toISOString() : new Date().toISOString(),
        p1DeckColor: p1DeckColor || undefined,
        p2DeckColor: p2DeckColor || undefined,
        p1Deck: p1DeckId.trim() || undefined,
        p2Deck: p2DeckId.trim() || undefined,
        games: [],
      };
      if (stage === 'Tournament') {
        const tid = tournamentId.trim();
        if (tid) body.tournament = tid;
        const r = round.trim();
        if (r) body.round = r;
      }
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        const m = data.message;
        error =
          typeof m === 'string' && m.trim()
            ? m.trim()
            : translate(getLocale(), 'common.errorWithStatus', { status: String(res.status) });
        loading = false;
        return;
      }
      const match = await res.json();
      await goto(`/matches/${match._id}`);
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('matches.new.pageTitle')}</title>
</svelte:head>

<div class="page new-match-page">
  <h2 class="page-title">{$t('matches.new.title')}</h2>
  <p class="page-sub">{$t('matches.new.subtitle')}</p>

  <form onsubmit={onSubmit} class="new-match__form stack">
    <input type="hidden" name="p1" value={p1} required />

    <!-- Match base info -->
    <section class="card stack new-match__card" aria-labelledby="match-card-title">
      <div class="formgrid">
        <label class="label" for="stage">
          {$t('matches.new.stageLabel')}
          <select id="stage" class="input" bind:value={stage}>
            {#each STAGE_OPTIONS as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
        </label>
        <label class="label" for="playedAt">
          {$t('matches.new.playedAtLabel')}
          <input id="playedAt" type="datetime-local" class="input" bind:value={playedAt} />
        </label>
      </div>
      {#if stage === 'Tournament'}
        <label class="label" for="match-tournament">{$t('matches.new.tournamentLabel')}</label>
        <button
          id="match-tournament"
          type="button"
          class="input new-match__select-btn"
          onclick={() => (tournamentPickerOpen = true)}
          disabled={tournamentsLoading}
          title={$t('matches.new.tournamentPickTitle')}
        >
          {tournamentButtonLabel}
        </button>
        {#if tournamentsError}
          <AppBanner variant="danger" message={tournamentsError} />
        {/if}
        <label class="label" for="round">{$t('matches.new.roundLabel')}</label>
        <input
          id="round"
          type="text"
          class="input"
          autocomplete="off"
          bind:value={round}
          placeholder={$t('matches.new.roundPlaceholder')}
        />
      {/if}
    </section>

    <!-- Player 1 -->
    <section
      class="card stack new-match__card new-match__card--player"
      aria-labelledby="p1-card-title"
    >
      <h3 id="p1-card-title" class="card__title new-match__card-title">
        {$t('matches.new.p1SectionTitle')}
      </h3>
      <p class="label" id="p1-label">{$t('common.player')}</p>
      <div
        id="p1"
        class="input new-match__you-display"
        aria-labelledby="p1-label"
        aria-live="polite"
      >
        {p1PlayerDisplayName}
      </div>
      {#if !p1}
        <p class="card__sub muted" role="status">
          {$t('matches.new.noPlayerLinked')}
        </p>
      {/if}
      {#if showP1DeckSelect}
        <label class="label" for="p1Deck">{$t('matches.new.deckLabel')}</label>
        <button
          id="p1Deck"
          type="button"
          class="input new-match__select-btn"
          onclick={() => openDeckPicker('p1')}
          title={$t('matches.new.deckOptionalTitle')}
        >
          {p1DeckButtonLabel}
        </button>
      {/if}
      <label class="label" for="p1DeckColor">{$t('matches.new.labelDeckColor')}</label>
      <DeckColorSelect
        id="p1DeckColor"
        bind:value={p1DeckColor}
        ariaLabel={$t('matches.new.ariaP1DeckColor')}
      />
    </section>

    <!-- Player 2 -->
    <section
      class="card stack new-match__card new-match__card--player"
      aria-labelledby="p2-card-title"
    >
      <h3 id="p2-card-title" class="card__title new-match__card-title">
        {$t('matches.new.p2SectionTitle')}
      </h3>
      <label class="label" for="p2-opponent">{$t('matches.new.opponentLabel')}</label>
      <div class="new-match__p2-filter-wrap">
        <input
          id="p2-opponent"
          type="text"
          class="input"
          maxlength="120"
          bind:value={p2NameFilter}
          placeholder={$t('matches.new.opponentFilterPlaceholder')}
          aria-label={$t('matches.new.opponentNameAria')}
          aria-expanded={p2FilterFocused}
          aria-controls={p2FilterFocused ? 'p2-opponent-suggestions' : undefined}
          autocomplete="off"
          onfocus={onP2FilterFocus}
          onblur={onP2FilterBlur}
        />
        {#if p2FilterFocused}
          <div
            id="p2-opponent-suggestions"
            class="new-match__p2-popover"
            onmousedown={onP2SuggestionsMouseDown}
          >
            {#if p2ListError}
              <AppBanner variant="danger" message={p2ListError} />
            {:else if p2ListLoading}
              <p class="card__sub muted new-match__p2-popover-pad" role="status">
                {$t('matches.new.p2ListLoading')}
              </p>
            {:else if p2Candidates.length === 0}
              <p class="card__sub muted new-match__p2-popover-pad" role="status">
                {p2NameFilter.trim()
                  ? $t('matches.new.p2ListEmpty')
                  : $t('matches.new.p2ListEmptyNoFilter')}
              </p>
            {:else}
              <ul class="new-match__p2-list" aria-label={$t('matches.new.opponentLabel')}>
                {#each p2Candidates as pl (pl._id)}
                  <li>
                    <button
                      type="button"
                      class="new-match__p2-row"
                      class:new-match__p2-row--selected={p2 === pl._id}
                      onclick={() => selectP2FromList(pl)}
                    >
                      <span class="new-match__p2-name">{pl.name}</span>
                      {#if pl.team}
                        <span class="muted new-match__p2-team">({pl.team})</span>
                      {/if}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if showP2CreateGuest}
              <div class="new-match__guest-create new-match__p2-popover-pad">
                <AppButton
                  type="button"
                  variant="primary"
                  disabled={createGuestLoading || !p2NameFilter.trim()}
                  onclick={createGuestOpponent}
                >
                  {createGuestLoading
                    ? $t('matches.new.createGuestCreating')
                    : $t('matches.new.createGuest')}
                </AppButton>
                <p class="card__sub muted new-match__guest-create-help">
                  {$t('matches.new.createGuestHelp', { name: p2NameFilter.trim() })}
                </p>
                {#if createGuestError}
                  <AppBanner variant="danger" message={createGuestError} />
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
      {#if p2}
        <p class="card__sub muted" role="status">
          {$t('matches.new.opponentSelected', { name: p2PlayerDisplayName })}
        </p>
      {/if}
      {#if showP2DeckSelect}
        <label class="label" for="p2Deck">{$t('matches.new.deckLabel')}</label>
        <button
          id="p2Deck"
          type="button"
          class="input new-match__select-btn"
          onclick={() => openDeckPicker('p2')}
          title={$t('matches.new.deckOptionalTitle')}
        >
          {p2DeckButtonLabel}
        </button>
      {/if}

      <label class="label" for="p2DeckColor">{$t('matches.new.labelDeckColor')}</label>
      <DeckColorSelect
        id="p2DeckColor"
        bind:value={p2DeckColor}
        ariaLabel={$t('matches.new.ariaP2DeckColor')}
      />
    </section>

    {#if error}
      <AppBanner variant="danger" message={error} />
    {/if}

    <div class="row new-match__actions">
      <AppButton type="submit" variant="primary" disabled={loading}>
        {loading ? $t('common.creating') : $t('matches.new.submit')}
      </AppButton>
      <AppButton href="/matches">{$t('common.cancel')}</AppButton>
    </div>
  </form>

  <DeckPickerModal
    bind:open={deckPickerOpen}
    title={$t('matches.new.deckPickerTitle')}
    forLabel={deckPickerRole === 'p1' ? p1PlayerDisplayName : p2PlayerDisplayName}
    filterPlayerId={deckPickerRole === 'p1' ? p1 : p2}
    onSelect={handleDeckSelect}
    onClose={() => (deckPickerOpen = false)}
  />
  <TournamentPickerModal
    bind:open={tournamentPickerOpen}
    title={$t('matches.new.tournamentPickerTitle')}
    {tournaments}
    loading={tournamentsLoading}
    error={tournamentsError}
    selectedId={tournamentId}
    onSelect={handleTournamentPickerSelect}
    onClose={() => (tournamentPickerOpen = false)}
  />
</div>

<style>
  .new-match-page {
    max-width: 720px;
  }
  .new-match__form {
    margin-top: 0;
  }
  .new-match__card {
    margin-bottom: var(--space-md, 1rem);
    z-index: 1;
  }
  /* Deck color dropdown extends past the card; raise stacking so it isn’t covered by the adjacent column. */
  .new-match__card:has(:global(.deck-color-select__trigger--open)),
  .new-match__card:has(.new-match__p2-popover) {
    z-index: 20;
  }
  .new-match__card-title {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  .new-match__actions {
    margin-top: var(--space-md, 1rem);
    gap: 0.75rem;
  }
  @media (min-width: 640px) {
    .new-match__form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-md, 1rem);
      align-items: stretch;
    }
    /** P1 / P2 share one row — stretch so both cards match the taller column. */
    .new-match__form .new-match__card--player {
      height: 100%;
      min-height: 0;
    }
    .new-match__form .new-match__card:first-of-type {
      grid-column: 1 / -1;
    }
    .new-match__form .new-match__actions {
      grid-column: 1 / -1;
    }
  }
  .new-match__select-btn {
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
  .new-match__you-display {
    margin: 0;
    cursor: default;
    display: flex;
    align-items: center;
    min-height: 2.5rem;
    font-weight: 600;
  }
  .new-match__p2-filter-wrap {
    position: relative;
  }
  .new-match__p2-popover {
    margin-top: 0.35rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 6px);
    background: var(--card);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    z-index: 30;
  }
  .new-match__p2-popover-pad {
    padding: 0.5rem 0.65rem;
    margin: 0;
  }
  .new-match__p2-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: none;
    overflow: visible;
    border: none;
    border-radius: 0;
    background: transparent;
  }
  .new-match__p2-list li {
    margin: 0;
  }
  .new-match__p2-row {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    padding: 0.5rem 0.65rem;
    margin: 0;
    border: none;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    color: var(--fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .new-match__p2-list li:last-child .new-match__p2-row {
    border-bottom: none;
  }
  .new-match__p2-row:hover {
    background: var(--bg, rgba(0, 0, 0, 0.04));
  }
  .new-match__p2-row--selected {
    background: color-mix(in srgb, var(--primary, #2563eb) 12%, transparent);
    font-weight: 600;
  }
  .new-match__p2-name {
    min-width: 0;
  }
  .new-match__p2-team {
    font-size: 0.9em;
  }
  .new-match__guest-create {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .new-match__guest-create-help {
    margin: 0;
    max-width: 42ch;
  }
</style>
