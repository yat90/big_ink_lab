<script lang="ts">
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getAuthToken } from '$lib/auth';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { config } from '$lib/config';
  import { translate, t, locale } from '$lib/i18n';
  import DeckColorSelect from '$lib/components/deck/DeckColorSelect.svelte';
  import DeckPickerModal from '$lib/components/deck/DeckPickerModal.svelte';
  import { onMount, tick } from 'svelte';
  import {
    emptyRound,
    parseLoreField,
    type RoundRow,
    type TournamentRoundResultMode,
    type GameRow,
  } from '$lib/tournament-results';
  import RoundEditor from './RoundEditor.svelte';

  const apiUrl = config.apiUrl ?? '/api';
  /** UI cap for round tabs (scrolls horizontally when many). */
  const MAX_ROUNDS = 20;

  /** Tournament is fixed via `?tournamentId=` (e.g. from tournament detail "Add results"). */
  const tournamentIdFromUrl = $derived($page.url.searchParams.get('tournamentId')?.trim() ?? '');

  type TournamentInfo = {
    name: string;
    date: string;
    location?: string;
    url?: string;
    meta?: string;
  };

  /** Loaded from `GET /tournaments/:id`; `null` while the initial fetch is in flight. */
  let tournamentInfo = $state<TournamentInfo | null>(null);
  /** Linked player id from /auth/me (current user only — no picker). */
  let eventP1 = $state('');
  /** Display name from /auth/me for "Playing as …" and opponent name checks. */
  let myPlayerName = $state('');
  let p1DeckId = $state('');
  let p1DeckDisplayName = $state('');
  /** Shared across all rounds (same as your deck). */
  let p1DeckColor = $state('');
  let rounds = $state<RoundRow[]>([emptyRound('1'), emptyRound('2'), emptyRound('3')]);
  /** Index of the round shown in the tab panel. */
  let activeRoundIndex = $state(0);
  let loading = $state(false);
  let error = $state('');
  let resultMessage = $state('');

  let deckPickerOpen = $state(false);

  /** Set P1 from the logged-in user's linked player only. */
  async function loadLinkedPlayer() {
    const token = getAuthToken();
    if (!token) {
      eventP1 = '';
      myPlayerName = '';
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const p = data?.player as { _id?: string; name?: string } | null | undefined;
        const id = p?._id;
        if (id && typeof id === 'string') {
          eventP1 = id;
          myPlayerName = typeof p.name === 'string' ? p.name.trim() : '';
        } else {
          eventP1 = '';
          myPlayerName = '';
        }
      } else {
        eventP1 = '';
        myPlayerName = '';
      }
    } catch {
      eventP1 = '';
      myPlayerName = '';
    }
  }

  function formatEventDate(iso: string | undefined): string {
    if (!iso?.trim()) return '–';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  $effect(() => {
    const id = tournamentIdFromUrl;
    if (!id) {
      tournamentInfo = null;
      return;
    }
    tournamentInfo = null;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiUrl}/tournaments/${id}`);
        if (!res.ok) {
          if (!cancelled)
            tournamentInfo = {
              name: translate(get(locale), 'common.defaultTournamentName'),
              date: '',
            };
          return;
        }
        const payload = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        const name =
          String(payload.name ?? '').trim() ||
          translate(get(locale), 'common.defaultTournamentName');
        const dateRaw = payload.date;
        const date =
          typeof dateRaw === 'string'
            ? dateRaw
            : dateRaw instanceof Date
              ? dateRaw.toISOString()
              : '';
        const loc = payload.location != null ? String(payload.location).trim() : '';
        const url = payload.url != null ? String(payload.url).trim() : '';
        const meta = payload.meta != null ? String(payload.meta).trim() : '';
        tournamentInfo = {
          name,
          date,
          ...(loc ? { location: loc } : {}),
          ...(url ? { url } : {}),
          ...(meta ? { meta } : {}),
        };
      } catch {
        if (!cancelled)
          tournamentInfo = {
            name: translate(get(locale), 'common.defaultTournamentName'),
            date: '',
          };
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  /** Scroll the active round tab into the visible strip. */
  $effect(() => {
    const idx = activeRoundIndex;
    void tick().then(() => {
      document.getElementById(`tab-tournament-results-round-${idx}`)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });
  });

  onMount(async () => {
    await loadLinkedPlayer();
  });

  async function fetchDeck(deckId: string): Promise<{ name: string; deckColor: string } | null> {
    if (!deckId.trim()) return null;
    try {
      const res = await fetch(`${apiUrl}/decks/${deckId}`);
      if (res.ok) {
        const deck = await res.json();
        return { name: deck?.name ?? '', deckColor: (deck?.deckColor ?? '').trim() };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async function handleDeckSelect(deckId: string) {
    const deck = deckId.trim() ? await fetchDeck(deckId) : null;
    p1DeckId = deckId;
    p1DeckDisplayName = deck?.name ?? '';
    if (deck?.deckColor?.trim()) {
      p1DeckColor = deck.deckColor.trim();
    } else if (!deckId.trim()) {
      p1DeckColor = '';
    }
    deckPickerOpen = false;
  }

  function addRound() {
    if (rounds.length >= MAX_ROUNDS) return;
    const label = String(rounds.length + 1);
    rounds = [...rounds, emptyRound(label)];
    activeRoundIndex = rounds.length - 1;
  }

  function removeRound(index: number) {
    if (rounds.length <= 1) return;
    const prevActive = activeRoundIndex;
    rounds = rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, round: String(i + 1) }));
    if (index < prevActive) activeRoundIndex = prevActive - 1;
    else if (index === prevActive) activeRoundIndex = Math.min(prevActive, rounds.length - 1);
    activeRoundIndex = Math.max(0, Math.min(activeRoundIndex, rounds.length - 1));
  }

  function setRoundLabel(roundIndex: number, raw: string) {
    rounds = rounds.map((row, i) => (i === roundIndex ? { ...row, round: raw } : row));
  }

  function blurRoundLabel(roundIndex: number, fallback: string) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex) return row;
      const trimmed = row.round.trim();
      return { ...row, round: trimmed || fallback };
    });
  }

  function setRoundResultMode(roundIndex: number, mode: TournamentRoundResultMode) {
    rounds = rounds.map((row, i) => (i === roundIndex ? { ...row, resultMode: mode } : row));
  }

  function patchRound(
    roundIndex: number,
    patch: Partial<Pick<RoundRow, 'opponentName' | 'p2DeckColor' | 'notes'>>
  ) {
    rounds = rounds.map((row, i) => (i === roundIndex ? { ...row, ...patch } : row));
  }

  function updateRoundGames(roundIndex: number, games: GameRow[]) {
    rounds = rounds.map((row, i) => (i === roundIndex ? { ...row, games } : row));
  }

  const deckPickerLabel = $derived.by(() => {
    const loc = get(locale);
    return myPlayerName || translate(loc, 'matches.new.you');
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    resultMessage = '';
    const loc = get(locale);
    if (!tournamentIdFromUrl) {
      error = translate(loc, 'tournaments.results.errMissingTournament');
      return;
    }
    if (!eventP1.trim()) {
      error = translate(loc, 'tournaments.results.errLinkedPlayerRequired');
      return;
    }
    const youName = myPlayerName.trim().toLowerCase();

    const bodyRounds: Array<
      | {
          round: string;
          intentionalDraw: true;
          opponentName: string;
          p2DeckColor?: string;
          notes?: string;
        }
      | {
          round: string;
          bye: true;
          notes?: string;
        }
      | {
          round: string;
          opponentName: string;
          p2DeckColor?: string;
          notes?: string;
          games: Array<{
            winnerSide: 'p1' | 'p2';
            starterSide?: 'p1' | 'p2';
            p1Lore?: number;
            p2Lore?: number;
            notes?: string;
          }>;
        }
    > = [];
    for (const r of rounds) {
      const roundLabel = r.round.trim();
      if (!roundLabel) {
        error = translate(loc, 'tournaments.results.errRoundLabel');
        return;
      }
      if (r.resultMode === 'bye') {
        bodyRounds.push({
          round: roundLabel,
          bye: true,
          ...(r.notes.trim() ? { notes: r.notes.trim() } : {}),
        });
        continue;
      }
      if (r.resultMode === 'intentionalDraw') {
        const oppId = r.opponentName.trim();
        if (!oppId) {
          error = translate(loc, 'tournaments.results.errIdNeedsOpponent', { round: roundLabel });
          return;
        }
        if (youName && oppId.toLowerCase() === youName) {
          error = translate(loc, 'tournaments.results.errOpponentSelf', { round: roundLabel });
          return;
        }
        bodyRounds.push({
          round: roundLabel,
          intentionalDraw: true,
          opponentName: oppId,
          ...(r.p2DeckColor?.trim() ? { p2DeckColor: r.p2DeckColor.trim() } : {}),
          ...(r.notes.trim() ? { notes: r.notes.trim() } : {}),
        });
        continue;
      }
      const opp = r.opponentName.trim();
      if (!opp) {
        error = translate(loc, 'tournaments.results.errOpponentRequired', { round: roundLabel });
        return;
      }
      if (youName && opp.toLowerCase() === youName) {
        error = translate(loc, 'tournaments.results.errOpponentSelf', { round: roundLabel });
        return;
      }
      const games = [];
      for (const g of r.games) {
        if (g.winnerSide !== 'p1' && g.winnerSide !== 'p2') {
          error = translate(loc, 'tournaments.results.errGameWinner', { round: roundLabel });
          return;
        }
        const p1Lore = parseLoreField(g.p1Lore);
        const p2Lore = parseLoreField(g.p2Lore);
        games.push({
          winnerSide: g.winnerSide,
          ...(g.starterSide === 'p1' || g.starterSide === 'p2'
            ? { starterSide: g.starterSide }
            : {}),
          ...(p1Lore !== undefined ? { p1Lore } : {}),
          ...(p2Lore !== undefined ? { p2Lore } : {}),
          notes: g.notes.trim() || undefined,
        });
      }
      bodyRounds.push({
        round: roundLabel,
        opponentName: opp,
        p2DeckColor: r.p2DeckColor || undefined,
        notes: r.notes.trim() || undefined,
        games,
      });
    }

    loading = true;
    try {
      const token = getAuthToken();
      const res = await fetch(`${apiUrl}/matches/tournaments/bulk-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tournamentId: tournamentIdFromUrl,
          p1: eventP1,
          p1Deck: p1DeckId.trim() || undefined,
          p1DeckColor: p1DeckColor || undefined,
          rounds: bodyRounds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error =
          (data as { message?: string }).message ??
          translate(loc, 'common.errorWithStatus', { status: String(res.status) });
        loading = false;
        return;
      }
      const created = (data as { created?: { _id: string }[] }).created ?? [];
      const failed = (data as { failed?: { round: string; message: string }[] }).failed ?? [];
      if (failed.length) {
        resultMessage = translate(loc, 'tournaments.results.createdPartial', {
          created: String(created.length),
          details: failed.map((f) => `${f.round}: ${f.message}`).join('; '),
        });
      } else {
        const intentionalDrawRounds = rounds.filter(
          (r) => r.resultMode === 'intentionalDraw'
        ).length;
        const byeRounds = rounds.filter((r) => r.resultMode === 'bye').length;
        const parts: string[] = [];
        if (intentionalDrawRounds > 0) {
          parts.push(
            translate(
              loc,
              intentionalDrawRounds === 1
                ? 'tournaments.results.extrasIntDrawsOne'
                : 'tournaments.results.extrasIntDrawsMany',
              { n: String(intentionalDrawRounds) }
            )
          );
        }
        if (byeRounds > 0) {
          parts.push(
            translate(
              loc,
              byeRounds === 1
                ? 'tournaments.results.extrasByesOne'
                : 'tournaments.results.extrasByesMany',
              { n: String(byeRounds) }
            )
          );
        }
        resultMessage =
          parts.length > 0
            ? translate(loc, 'tournaments.results.createdOkExtras', {
                created: String(created.length),
                extras: parts.join(' · '),
              })
            : translate(loc, 'tournaments.results.createdOk', { created: String(created.length) });
      }
      if (!failed.length) {
        await goto(`/tournaments/${tournamentIdFromUrl}`);
        return;
      }
    } catch {
      error = translate(get(locale), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('tournaments.results.pageTitle')}</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">{$t('tournaments.results.title')}</h1>

  {#if !tournamentIdFromUrl}
    <AppCard className="stack">
      <p class="card__sub" style="margin: 0;">
        {$t('tournaments.results.noTournamentBefore')}<strong
          >{$t('tournaments.results.noTournamentStrong')}</strong
        >{$t('tournaments.results.noTournamentAfter')}<code class="muted"
          >{$t('tournaments.results.paramTournamentId')}</code
        >{$t('tournaments.results.noTournamentAfterCode')}
      </p>
      <p class="card__sub" style="margin: 0;">
        <a href="/tournaments">{$t('tournaments.results.browseLink')}</a>
      </p>
    </AppCard>
  {:else}
    {#if tournamentInfo === null}
      <AppCard className="stack tournament-results__tournament-card" aria-busy="true">
        <div class="loading-skeleton" aria-hidden="true">
          <div class="loading-skeleton__line loading-skeleton__line--title"></div>
          <div class="loading-skeleton__line"></div>
        </div>
        <p class="card__sub muted" style="margin: 0;">{$t('common.loadingTournament')}</p>
      </AppCard>
    {:else}
      <AppCard
        className="stack tournament-results__tournament-card"
        aria-labelledby="tr-tournament-heading"
      >
        <div class="tournament-results__tournament-head row">
          <h2 id="tr-tournament-heading" class="card__title tournament-results__tournament-title">
            {tournamentInfo.name}
          </h2>
          <a
            href="/tournaments/{tournamentIdFromUrl}"
            class="muted tournament-results__tournament-back"
          >
            {$t('tournaments.results.viewTournament')}
          </a>
        </div>
        <ul class="tournament-results__facts muted" aria-label={$t('common.tournamentDetailsAria')}>
          <li><strong>{$t('common.date')}</strong> {formatEventDate(tournamentInfo.date)}</li>
          {#if tournamentInfo.meta?.trim()}
            <li><strong>{$t('common.meta')}</strong> {tournamentInfo.meta.trim()}</li>
          {/if}
          {#if tournamentInfo.location?.trim()}
            {@const loc = tournamentInfo.location.trim()}
            <li>
              <strong>{$t('common.location')}</strong>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`}
                class="tournament-results__fact-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {loc}
              </a>
            </li>
          {/if}
          {#if tournamentInfo.url?.trim()}
            <li>
              <strong>{$t('common.link')}</strong>
              <a
                href={tournamentInfo.url.trim()}
                class="tournament-results__fact-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {tournamentInfo.url.trim()}
              </a>
            </li>
          {/if}
        </ul>
      </AppCard>
    {/if}

    <form class="stack tournament-results__form" onsubmit={onSubmit}>
      <div class="row tournament-results__actions tournament-results__actions--top">
        <AppButton type="submit" variant="primary" disabled={loading}>
          {loading ? $t('common.saving') : $t('tournaments.results.save')}
        </AppButton>
        <AppButton href="/tournaments/{tournamentIdFromUrl}">{$t('common.cancel')}</AppButton>
      </div>

      <AppCard className="stack">
        <h3 class="card__title" style="margin: 0;">{$t('tournaments.results.youSection')}</h3>
        {#if eventP1}
          <p class="card__sub muted" style="margin: 0;">
            {$t('tournaments.results.playingAs')}<strong
              >{myPlayerName || $t('tournaments.results.yourProfile')}</strong
            >
            <span class="muted">{$t('tournaments.results.resultsSavedNote')}</span>
          </p>

          <label class="label" for="event-p1-deck" style="margin-top: 0.5rem;">
            {$t('tournaments.results.yourDeck')}
          </label>
          <button
            id="event-p1-deck"
            type="button"
            class="input tournament-results__select-btn"
            onclick={() => (deckPickerOpen = true)}
          >
            {p1DeckDisplayName || $t('tournaments.results.chooseDeckOptional')}
          </button>

          <label class="label" for="event-p1-deck-color">
            {$t('tournaments.results.yourDeckColor')}
          </label>
          <DeckColorSelect
            id="event-p1-deck-color"
            bind:value={p1DeckColor}
            ariaLabel={$t('tournaments.results.yourDeckColorAria')}
          />
        {:else}
          <p class="card__sub" style="margin: 0;">
            {$t('tournaments.results.signInLinked')}
          </p>
        {/if}
        {#if error}
          <div class="tournament-results__error" role="alert">
            <AppBanner variant="danger" message={error} />
          </div>
        {/if}
      </AppCard>

      <div class="stack tournament-results__rounds-wrap">
        <div class="tournament-results__tabs-bar">
          <div class="tournament-results__tabs-scroll">
            <div
              class="app-tabs tournament-results__round-tabs"
              role="tablist"
              aria-label={$t('tournaments.results.roundsTablist')}
            >
              {#each rounds as rTab, i (i)}
                <button
                  type="button"
                  role="tab"
                  id="tab-tournament-results-round-{i}"
                  aria-controls="panel-tournament-results-round"
                  aria-selected={activeRoundIndex === i}
                  class="app-tabs__tab"
                  class:app-tabs__tab--active={activeRoundIndex === i}
                  onclick={() => (activeRoundIndex = i)}
                >
                  {$t('tournaments.results.roundTab', { label: rTab.round })}
                </button>
              {/each}
            </div>
          </div>
          <AppButton
            type="button"
            className="tournament-results__add-round-tab"
            disabled={rounds.length >= MAX_ROUNDS}
            title={rounds.length >= MAX_ROUNDS
              ? $t('tournaments.results.addRoundMaxTitle', { max: String(MAX_ROUNDS) })
              : $t('tournaments.results.addRoundTitle')}
            onclick={addRound}
          >
            + {$t('tournaments.results.addRound')}
          </AppButton>
        </div>

        <AppCard
          id="panel-tournament-results-round"
          className="stack tournament-results__round"
          role="tabpanel"
          tabindex="0"
          aria-labelledby="tab-tournament-results-round-{activeRoundIndex}"
        >
          {#each [activeRoundIndex] as roundIndex (roundIndex)}
            <RoundEditor
              round={rounds[roundIndex]}
              {roundIndex}
              totalRounds={rounds.length}
              {eventP1}
              onSetLabel={(raw) => setRoundLabel(roundIndex, raw)}
              onBlurLabel={(fallback) => blurRoundLabel(roundIndex, fallback)}
              onSetResultMode={(mode) => setRoundResultMode(roundIndex, mode)}
              onPatchRound={(patch) => patchRound(roundIndex, patch)}
              onRemoveRound={() => removeRound(roundIndex)}
              onUpdateGames={(games) => updateRoundGames(roundIndex, games)}
            />
          {/each}
        </AppCard>
      </div>

      {#if resultMessage}
        <p class="card__sub" role="status">{resultMessage}</p>
      {/if}
    </form>
  {/if}

  <DeckPickerModal
    bind:open={deckPickerOpen}
    title={$t('tournaments.results.deckPickerTitle')}
    forLabel={deckPickerLabel}
    filterPlayerId={eventP1}
    onSelect={handleDeckSelect}
    onClose={() => {
      deckPickerOpen = false;
    }}
  />
</div>

<style>
  .tournament-results__tournament-card {
    margin-bottom: var(--space-md, 1rem);
  }
  .tournament-results__error {
    margin: 0.75rem 0 0 0;
  }
  .tournament-results__tournament-head {
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournament-results__tournament-title {
    margin: 0;
    flex: 1 1 12rem;
    min-width: 0;
    word-break: break-word;
  }
  .tournament-results__tournament-back {
    flex-shrink: 0;
    font-size: 0.875rem;
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .tournament-results__tournament-back:hover {
    border-bottom-color: currentColor;
  }
  .tournament-results__facts {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  .tournament-results__facts li {
    margin-bottom: 0.25rem;
  }
  .tournament-results__fact-link {
    color: inherit;
    word-break: break-all;
  }
  /**
   * Tab row: scrollable round tabs + add button pinned on the right.
   * Grid/flex defaults use min-width:auto so the row was growing to full tab width with no scroll;
   * min-width:0 + flex-basis:0 on the scroll strip fixes horizontal overflow.
   */
  .tournament-results__rounds-wrap {
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
  .tournament-results__form.stack {
    min-width: 0;
    margin-top: var(--space-md, 1rem);
    margin-bottom: 5rem;
  }
  .tournament-results__tabs-bar {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    margin-top: var(--space-md, 1rem);
    margin-bottom: var(--space-lg, 1.25rem);
    padding-bottom: var(--space-md, 1rem);
    border-bottom: 1px solid var(--border);
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
  .tournament-results__tabs-scroll {
    flex: 1 1 0%;
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }
  .tournament-results__tabs-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .tournament-results__tabs-scroll::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 3px;
  }
  .tournament-results__round-tabs.app-tabs {
    margin: 0;
    padding: 0;
    border: none;
    margin-bottom: 0;
    flex-wrap: nowrap;
    width: max-content;
    max-width: none;
    gap: 0.25rem;
  }
  .tournament-results__round-tabs .app-tabs__tab {
    flex: 0 0 auto;
    padding: 0.45rem;
    font-size: 1.3rem;
    line-height: 1.3rem;
    white-space: nowrap;
  }
  .tournament-results__add-round-tab {
    flex-shrink: 0;
    align-self: center;
  }
  .tournament-results__select-btn {
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
  .tournament-results__actions {
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .tournament-results__actions--top {
    margin-top: var(--space-md, 1rem);
  }
  .tournament-results__form :global(.deck-color-select) {
    z-index: 1;
  }
  .tournament-results__round:has(:global(.deck-color-select__trigger--open)) {
    z-index: 10;
    position: relative;
  }
</style>
