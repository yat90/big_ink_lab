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
  import IconTrash from '../../../lib/icons/IconTrash.svelte';

  type GameRow = {
    winnerSide: '' | 'p1' | 'p2';
    starterSide: '' | 'p1' | 'p2';
    p1Lore: string;
    p2Lore: string;
    notes: string;
  };
  type TournamentRoundResultMode = 'match' | 'intentionalDraw' | 'bye';

  type RoundRow = {
    round: string;
    /** `match` = played games; `intentionalDraw` = ID; `bye` = free win. */
    resultMode: TournamentRoundResultMode;
    /** Opponent name; API resolves to existing player or creates a guest. */
    opponentName: string;
    p2DeckColor: string;
    notes: string;
    games: GameRow[];
  };

  const apiUrl = config.apiUrl ?? '/api';
  /** UI cap for round tabs (scrolls horizontally when many). */
  const MAX_ROUNDS = 20;
  /** Same as match lore tracker: first to 20 wins; if both ≥20, higher lore wins (ties → P1). */
  const GAME_LORE_WIN = 20;

  /** Tournament is fixed via `?tournamentId=` (e.g. from tournament detail “Add results”). */
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
  /** Display name from /auth/me for “Playing as …” and opponent name checks. */
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

  function emptyGame(): GameRow {
    return {
      winnerSide: '',
      starterSide: '',
      p1Lore: '',
      p2Lore: '',
      notes: '',
    };
  }

  function emptyRound(label: string): RoundRow {
    return {
      round: label,
      resultMode: 'match',
      opponentName: '',
      p2DeckColor: '',
      notes: '',
      games: [emptyGame()],
    };
  }

  function roundP2Label(r: RoundRow): string {
    const name = r.opponentName.trim();
    return name || translate(get(locale), 'tournaments.results.opponentFallback');
  }

  function setRoundResultMode(roundIndex: number, mode: TournamentRoundResultMode) {
    rounds = rounds.map((row, i) => (i === roundIndex ? { ...row, resultMode: mode } : row));
  }

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

  /** Scroll the active round tab into the visible strip (pairs with min-width fix on the scroll container). */
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

  function openDeckPickerEventP1() {
    deckPickerOpen = true;
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
      const t = row.round.trim();
      return { ...row, round: t || fallback };
    });
  }

  function patchGame(roundIndex: number, gameIndex: number, patch: Partial<GameRow>) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex) return row;
      return {
        ...row,
        games: row.games.map((g, gi) => (gi === gameIndex ? { ...g, ...patch } : g)),
      };
    });
  }

  /** Loser of the previous game goes first in the next (typical “loser starts”). */
  function starterSideAfterPrevious(prev: GameRow): '' | 'p1' | 'p2' {
    if (prev.winnerSide === 'p1') return 'p2';
    if (prev.winnerSide === 'p2') return 'p1';
    return '';
  }

  function addGame(roundIndex: number) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex) return row;
      const prev = row.games[row.games.length - 1];
      const starterSide = starterSideAfterPrevious(prev);
      return {
        ...row,
        games: [...row.games, { ...emptyGame(), starterSide }],
      };
    });
  }

  function removeGame(roundIndex: number, gameIndex: number) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex || row.games.length <= 1) return row;
      return { ...row, games: row.games.filter((_, gi) => gi !== gameIndex) };
    });
  }

  const deckPickerLabel = $derived.by(() => {
    const loc = get(locale);
    return myPlayerName || translate(loc, 'matches.new.you');
  });

  function parseLoreField(s: string): number | undefined {
    const t = s.trim();
    if (t === '') return undefined;
    const n = Number.parseInt(t, 10);
    if (Number.isNaN(n) || n < 0) return undefined;
    return n;
  }

  /** Derive winner from lore (used when editing lore fields). */
  function winnerSideFromLore(p1Str: string, p2Str: string): '' | 'p1' | 'p2' {
    const p1 = parseLoreField(p1Str);
    const p2 = parseLoreField(p2Str);
    if (p1 === undefined && p2 === undefined) return '';
    if (p1 !== undefined && p2 !== undefined) {
      if (p1 >= GAME_LORE_WIN && p2 >= GAME_LORE_WIN) {
        return p1 >= p2 ? 'p1' : 'p2';
      }
      if (p1 >= GAME_LORE_WIN && p2 < GAME_LORE_WIN) return 'p1';
      if (p2 >= GAME_LORE_WIN && p1 < GAME_LORE_WIN) return 'p2';
      if (p1 > p2) return 'p1';
      if (p2 > p1) return 'p2';
      return '';
    }
    if (p1 !== undefined && p2 === undefined && p1 >= GAME_LORE_WIN) return 'p1';
    if (p2 !== undefined && p1 === undefined && p2 >= GAME_LORE_WIN) return 'p2';
    return '';
  }

  function patchGameLore(
    roundIndex: number,
    gameIndex: number,
    lore: { p1Lore?: string; p2Lore?: string }
  ) {
    rounds = rounds.map((row, i) => {
      if (i !== roundIndex) return row;
      return {
        ...row,
        games: row.games.map((g, gi) => {
          if (gi !== gameIndex) return g;
          const next = { ...g, ...lore };
          return { ...next, winnerSide: winnerSideFromLore(next.p1Lore, next.p2Lore) };
        }),
      };
    });
  }

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

          <label class="label" for="event-p1-deck" style="margin-top: 0.5rem;"
            >{$t('tournaments.results.yourDeck')}</label
          >
          <button
            id="event-p1-deck"
            type="button"
            class="input tournament-results__select-btn"
            onclick={openDeckPickerEventP1}
          >
            {p1DeckDisplayName || $t('tournaments.results.chooseDeckOptional')}
          </button>

          <label class="label" for="event-p1-deck-color"
            >{$t('tournaments.results.yourDeckColor')}</label
          >
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
            {@const r = rounds[roundIndex]}
            <div class="tournament-results__round-head row">
              <h2 class="card__title tournament-results__round-heading">
                <span class="tournament-results__round-heading-prefix"
                  >{$t('tournaments.results.roundHeadingPrefix')}</span
                >
                <input
                  id="round-label-{roundIndex}"
                  type="text"
                  class="input tournament-results__round-heading-input"
                  value={r.round}
                  maxlength="40"
                  autocomplete="off"
                  aria-label={$t('tournaments.results.roundLabelAria')}
                  oninput={(e) => setRoundLabel(roundIndex, e.currentTarget.value)}
                  onblur={() => blurRoundLabel(roundIndex, String(roundIndex + 1))}
                />
              </h2>
              {#if rounds.length > 1}
                <AppButton
                  type="button"
                  size="sm"
                  variant="dangerOutline"
                  onclick={() => removeRound(roundIndex)}
                >
                  <IconTrash size={18} className="game-line__icon icon-trash" />&nbsp;{$t(
                    'tournaments.results.remove'
                  )}
                </AppButton>
              {/if}
            </div>

            <div class="tournament-results__id-field">
              <p
                class="label tournament-results__id-field-label"
                id="tr-round-mode-label-{roundIndex}"
              >
                {$t('tournaments.results.pairingResult')}
              </p>
              <div
                class="tournament-results__id-chips tournament-results__mode-chips"
                role="radiogroup"
                aria-labelledby="tr-round-mode-label-{roundIndex}"
              >
                <label
                  class="tournament-results__id-chip"
                  class:tournament-results__id-chip--active={r.resultMode === 'match'}
                >
                  <input
                    type="radio"
                    class="tournament-results__id-chip-input"
                    name="tr-round-mode-{roundIndex}"
                    checked={r.resultMode === 'match'}
                    onchange={() => setRoundResultMode(roundIndex, 'match')}
                  />
                  <span class="tournament-results__id-chip-text"
                    >{$t('tournaments.results.modeMatch')}</span
                  >
                </label>
                <label
                  class="tournament-results__id-chip"
                  class:tournament-results__id-chip--active={r.resultMode === 'intentionalDraw'}
                >
                  <input
                    type="radio"
                    class="tournament-results__id-chip-input"
                    name="tr-round-mode-{roundIndex}"
                    checked={r.resultMode === 'intentionalDraw'}
                    onchange={() => setRoundResultMode(roundIndex, 'intentionalDraw')}
                  />
                  <span class="tournament-results__id-chip-text"
                    >{$t('tournaments.results.modeIntentionalDraw')}</span
                  >
                </label>
                <label
                  class="tournament-results__id-chip"
                  class:tournament-results__id-chip--active={r.resultMode === 'bye'}
                >
                  <input
                    type="radio"
                    class="tournament-results__id-chip-input"
                    name="tr-round-mode-{roundIndex}"
                    checked={r.resultMode === 'bye'}
                    onchange={() => setRoundResultMode(roundIndex, 'bye')}
                  />
                  <span class="tournament-results__id-chip-text"
                    >{$t('tournaments.results.modeBye')}</span
                  >
                </label>
              </div>
              <p class="card__sub muted tournament-results__id-help">
                {#if r.resultMode === 'intentionalDraw'}
                  {$t('tournaments.results.helpIntentionalDraw')}
                {:else if r.resultMode === 'bye'}
                  {$t('tournaments.results.helpBye')}
                {:else}
                  {$t('tournaments.results.helpMatch')}
                {/if}
              </p>
            </div>

            {#if r.resultMode === 'bye'}
              <p class="card__sub muted" style="margin: 0 0 0.35rem 0;">
                {$t('tournaments.results.byeNoOpponent')}
              </p>
            {:else}
              <label class="label" for="opponent-{roundIndex}"
                >{$t('tournaments.results.opponent')}</label
              >
              <input
                id="opponent-{roundIndex}"
                type="text"
                class="input"
                maxlength="120"
                value={r.opponentName}
                oninput={(e) => {
                  const v = e.currentTarget.value;
                  rounds = rounds.map((row, i) =>
                    i === roundIndex ? { ...row, opponentName: v } : row
                  );
                }}
                placeholder={r.resultMode === 'intentionalDraw'
                  ? $t('tournaments.results.opponentPlaceholderId')
                  : $t('tournaments.results.opponentPlaceholder')}
                aria-label={$t('tournaments.results.opponentAria')}
              />

              <label class="label" for="p2c-{roundIndex}"
                >{$t('tournaments.results.opponentDeckColor')}</label
              >
              <DeckColorSelect
                id="p2c-{roundIndex}"
                bind:value={r.p2DeckColor}
                ariaLabel={$t('tournaments.results.opponentDeckColorAria')}
              />
            {/if}

            <label class="label" for="mnotes-{roundIndex}"
              >{$t('tournaments.results.matchNotes')}</label
            >
            <textarea
              id="mnotes-{roundIndex}"
              class="input"
              rows="2"
              bind:value={r.notes}
              placeholder={$t('tournaments.results.matchNotesPlaceholder')}
            ></textarea>

            {#if r.resultMode === 'match'}
              <div class="tournament-results__games-head row">
                <h3 class="tournament-results__games-title">
                  {$t('tournaments.results.gamesTitle')}
                </h3>
                <AppButton
                  type="button"
                  className="tournament-results__add-game-btn"
                  onclick={() => addGame(roundIndex)}
                >
                  + {$t('tournaments.results.addGame')}
                </AppButton>
              </div>
              {#each r.games as g, gi (`${roundIndex}-${gi}`)}
                <div class="tournament-results__game stack">
                  <span class="tournament-results__game-label"
                    >{$t('tournaments.results.gameN', { n: String(gi + 1) })}</span
                  >
                  <div
                    class="tournament-results__lore-vs"
                    role="group"
                    aria-label={$t('tournaments.results.loreYouVsOpponent')}
                  >
                    <div class="tournament-results__lore-side tournament-results__lore-side--p1">
                      <label class="tournament-results__lore-label" for="l1-{roundIndex}-{gi}"
                        >{$t('tournaments.results.yourLore')}</label
                      >
                      <input
                        id="l1-{roundIndex}-{gi}"
                        type="number"
                        min="0"
                        class="input tournament-results__lore-input"
                        inputmode="numeric"
                        value={g.p1Lore}
                        oninput={(e) =>
                          patchGameLore(roundIndex, gi, { p1Lore: e.currentTarget.value })}
                      />
                    </div>
                    <div class="tournament-results__lore-vs-mid" aria-hidden="true">
                      {$t('tournaments.results.vsDot')}
                    </div>
                    <div class="tournament-results__lore-side tournament-results__lore-side--p2">
                      <label class="tournament-results__lore-label" for="l2-{roundIndex}-{gi}"
                        >{$t('tournaments.results.opponentLore')}</label
                      >
                      <input
                        id="l2-{roundIndex}-{gi}"
                        type="number"
                        min="0"
                        class="input tournament-results__lore-input tournament-results__lore-input--p2"
                        inputmode="numeric"
                        value={g.p2Lore}
                        oninput={(e) =>
                          patchGameLore(roundIndex, gi, { p2Lore: e.currentTarget.value })}
                      />
                    </div>
                  </div>
                  <div class="tournament-results__game-toggles">
                    <div class="tournament-results__toggle-group">
                      <p class="tournament-results__toggle-label" id="gs-label-{roundIndex}-{gi}">
                        {$t('tournaments.results.starterOptional')}
                      </p>
                      <div
                        class="tournament-results__toggle"
                        role="group"
                        aria-labelledby="gs-label-{roundIndex}-{gi}"
                      >
                        <button
                          type="button"
                          class="tournament-results__toggle-btn"
                          aria-pressed={g.starterSide === 'p1'}
                          disabled={!eventP1}
                          onclick={() => patchGame(roundIndex, gi, { starterSide: 'p1' })}
                        >
                          {$t('tournaments.results.youToggle')}
                        </button>
                        <button
                          type="button"
                          class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
                          aria-pressed={g.starterSide === ''}
                          onclick={() => patchGame(roundIndex, gi, { starterSide: '' })}
                        >
                          {$t('tournaments.results.dashNeutral')}
                        </button>
                        <button
                          type="button"
                          class="tournament-results__toggle-btn"
                          aria-pressed={g.starterSide === 'p2'}
                          disabled={!r.opponentName.trim()}
                          onclick={() => patchGame(roundIndex, gi, { starterSide: 'p2' })}
                        >
                          {roundP2Label(r)}
                        </button>
                      </div>
                    </div>
                    <div class="tournament-results__toggle-group">
                      <p class="tournament-results__toggle-label" id="gw-label-{roundIndex}-{gi}">
                        {$t('tournaments.results.winner')}
                      </p>
                      <div
                        class="tournament-results__toggle"
                        role="group"
                        aria-labelledby="gw-label-{roundIndex}-{gi}"
                        title={$t('tournaments.results.winnerLoreTitle')}
                      >
                        <button
                          type="button"
                          class="tournament-results__toggle-btn"
                          aria-pressed={g.winnerSide === 'p1'}
                          disabled={!eventP1}
                          onclick={() => patchGame(roundIndex, gi, { winnerSide: 'p1' })}
                        >
                          {$t('tournaments.results.youToggle')}
                        </button>
                        <button
                          type="button"
                          class="tournament-results__toggle-btn tournament-results__toggle-btn--mid"
                          aria-pressed={g.winnerSide === ''}
                          onclick={() => patchGame(roundIndex, gi, { winnerSide: '' })}
                        >
                          {$t('tournaments.results.dashNeutral')}
                        </button>
                        <button
                          type="button"
                          class="tournament-results__toggle-btn"
                          aria-pressed={g.winnerSide === 'p2'}
                          disabled={!r.opponentName.trim()}
                          onclick={() => patchGame(roundIndex, gi, { winnerSide: 'p2' })}
                        >
                          {roundP2Label(r)}
                        </button>
                      </div>
                    </div>
                  </div>
                  <label
                    class="label tournament-results__game-field-label"
                    for="gn-{roundIndex}-{gi}">{$t('tournaments.results.gameNotes')}</label
                  >
                  <textarea
                    id="gn-{roundIndex}-{gi}"
                    rows="2"
                    class="input tournament-results__note-input"
                    bind:value={g.notes}
                    oninput={(e) => patchGame(roundIndex, gi, { notes: e.currentTarget.value })}
                    placeholder={$t('tournaments.results.gameNotesPlaceholder')}
                  ></textarea>
                  {#if r.games.length > 1}
                    <AppButton
                      type="button"
                      size="sm"
                      variant="dangerOutline"
                      className="tournament-results__remove-game-btn"
                      onclick={() => removeGame(roundIndex, gi)}
                    >
                      <IconTrash size={18} className="game-line__icon icon-trash" />&nbsp;{$t(
                        'tournaments.results.removeGame'
                      )}
                    </AppButton>
                  {/if}
                </div>
              {/each}
              <AppButton
                type="button"
                className="tournament-results__add-game-btn tournament-results__add-game-btn--footer"
                onclick={() => addGame(roundIndex)}
              >
                + {$t('tournaments.results.addGame')}
              </AppButton>
            {:else if r.resultMode === 'intentionalDraw'}
              <AppCard className="tournament-results__id-games-skip stack">
                <p class="card__sub muted" style="margin: 0;">
                  {$t('tournaments.results.skipIdGames')}
                </p>
              </AppCard>
            {:else if r.resultMode === 'bye'}
              <AppCard className="tournament-results__id-games-skip stack">
                <p class="card__sub muted" style="margin: 0;">
                  {$t('tournaments.results.skipByeGames')}
                </p>
              </AppCard>
            {/if}
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
  .tournament-results__round-head {
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tournament-results__round-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .tournament-results__round-heading-prefix {
    flex-shrink: 0;
    color: var(--fg);
  }
  .tournament-results__round-heading-input {
    flex: 1 1 6rem;
    min-width: 4rem;
    max-width: 18rem;
    min-height: 44px;
    padding: 0.35rem 0.65rem;
    font: inherit;
    font-weight: 700;
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .tournament-results__id-field {
    margin-top: 0.15rem;
  }
  .tournament-results__id-field-label {
    margin: 0 0 0.35rem 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .tournament-results__id-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm, 0.5rem);
  }
  .tournament-results__id-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs, 4px);
    padding: 10px 16px;
    min-height: 44px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--glass-bg);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--fg);
    transition:
      background var(--transition),
      border-color var(--transition),
      color var(--transition);
  }
  .tournament-results__id-chip:hover {
    background: var(--glass-bg-strong);
    border-color: var(--border-strong);
  }
  .tournament-results__id-chip:focus-within {
    outline: 2px solid var(--ink-glow);
    outline-offset: 2px;
  }
  .tournament-results__id-chip--active:focus-within {
    outline-color: rgba(255, 255, 255, 0.35);
  }
  .tournament-results__id-chip--active {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }
  .tournament-results__id-chip--active:hover {
    background: var(--ink-hover);
    border-color: var(--ink-hover);
    color: white;
  }
  .tournament-results__id-chip-input {
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
  .tournament-results__id-chip-text {
    user-select: none;
  }
  .tournament-results__id-help {
    margin: 0.5rem 0 0.85rem 0;
    font-size: 0.8125rem;
    line-height: 1.45;
  }
  .tournament-results__id-games-skip {
    margin-top: 0.35rem;
    padding: 0.65rem 0.75rem;
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border);
    border-radius: var(--radius);
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
  .tournament-results__games-head {
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 0.35rem 0 0.4rem 0;
  }
  @media (max-width: 380px) {
    .tournament-results__games-head {
      flex-direction: column;
      align-items: stretch;
    }
    .tournament-results__add-game-btn {
      width: 100%;
      justify-content: center;
    }
  }
  .tournament-results__games-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }
  .tournament-results__add-game-btn {
    flex-shrink: 0;
    min-height: 40px;
    padding: 7px 12px;
    font-size: 0.875rem;
  }
  .tournament-results__add-game-btn--footer {
    width: 100%;
    margin-top: 0.15rem;
  }
  .tournament-results__game {
    padding: 0.45rem 0.55rem;
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
    max-width: 100%;
  }
  .tournament-results__game.stack {
    gap: 0.35rem;
  }
  @media (max-width: 479px) {
    .tournament-results__game {
      padding: 0.55rem 0.65rem;
    }
    .tournament-results__game.stack {
      gap: 0.55rem;
    }
    .tournament-results__add-game-btn {
      min-height: 44px;
    }
  }
  .tournament-results__game-label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--muted);
    margin-bottom: -0.05rem;
  }
  .tournament-results__game-field-label {
    gap: 4px;
    font-size: 0.8125rem;
  }
  .tournament-results__lore-vs {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.35rem 0.5rem;
    width: 100%;
    min-width: 0;
  }
  .tournament-results__lore-side {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 4px;
  }
  .tournament-results__lore-side--p1 {
    align-items: flex-start;
  }
  .tournament-results__lore-side--p2 {
    align-items: flex-end;
  }
  .tournament-results__lore-label {
    margin: 0;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--muted);
  }
  .tournament-results__lore-vs-mid {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    padding: 0 0.15rem;
    font-size: clamp(1.25rem, 4vw, 1.75rem);
    line-height: 1;
    font-weight: 800;
    color: var(--muted);
    user-select: none;
  }
  /** Narrow screens: stack lore fields so inputs stay wide and tappable (no squeezed columns). */
  @media (max-width: 419px) {
    .tournament-results__lore-vs {
      flex-direction: column;
      align-items: stretch;
      gap: 0.45rem;
    }
    .tournament-results__lore-vs-mid {
      align-self: center;
      padding: 0.1rem 0;
      font-size: 0.9375rem;
      letter-spacing: 0.08em;
    }
    .tournament-results__lore-side--p2 {
      align-items: flex-start;
    }
    .tournament-results__lore-input--p2 {
      text-align: left;
    }
  }
  .tournament-results__lore-input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 16px;
  }
  .tournament-results__lore-input--p2 {
    text-align: right;
  }
  .tournament-results__note-input {
    min-height: 40px;
    padding: 8px 10px;
  }
  @media (max-width: 479px) {
    .tournament-results__note-input {
      min-height: 44px;
      padding: 10px 12px;
    }
  }
  .tournament-results__game-toggles {
    display: grid;
    gap: 0.35rem;
  }
  @media (min-width: 480px) {
    .tournament-results__game-toggles {
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
    }
  }
  .tournament-results__toggle-label {
    margin: 0 0 0.2rem 0;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--muted);
    letter-spacing: 0.01em;
  }
  .tournament-results__toggle {
    display: flex;
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
    overflow: hidden;
    margin-bottom: 0;
  }
  .tournament-results__toggle-btn {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 10px 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--text);
    transition: background 0.15s var(--ease);
    -webkit-tap-highlight-color: transparent;
  }
  @media (min-width: 480px) {
    .tournament-results__toggle-btn {
      min-height: 0;
      padding: 7px 4px;
      font-size: 0.75rem;
    }
  }
  .tournament-results__toggle-btn + .tournament-results__toggle-btn {
    border-left: 1px solid var(--border-strong);
  }
  .tournament-results__toggle-btn:not(.tournament-results__toggle-btn--mid) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tournament-results__toggle-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tournament-results__toggle-btn[aria-pressed='true'] {
    background: var(--glass-bg-strong);
  }
  .tournament-results__toggle-btn--mid {
    flex: 0 0 2.75rem;
    color: var(--muted);
    font-weight: 700;
  }
  @media (min-width: 480px) {
    .tournament-results__toggle-btn--mid {
      flex: 0 0 2.25rem;
    }
  }
  .tournament-results__remove-game-btn {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    align-self: flex-start;
  }
  @media (max-width: 379px) {
    .tournament-results__remove-game-btn {
      width: 100%;
      justify-content: center;
      align-self: stretch;
    }
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
