<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import PlayerStatsOverview, { type PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';

  type MeUser = { id: string; email: string; name?: string };
  type MePlayer = { _id: string; name: string; team: string };

  type DeckColorStats = {
    deckColor: string;
    matchesPlayed: number;
    matchesWon: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
  };
  type StageMixItem = { stage: string; count: number; percentage: number };
  type PlayStyleSummary = {
    playerId: string;
    matchesAnalyzed: number;
    gamesAnalyzed: number;
    deckColorStats: DeckColorStats[];
    stageMix: StageMixItem[];
    starterWinRate: number;
    nonStarterWinRate: number;
    starterAdvantageDelta: number;
    avgLoreWhenWinning: number | null;
    avgLoreWhenLosing: number | null;
    preferredDeckColor: string | null;
    bestPerformingDeckColor: string | null;
    decksUsed: { _id: string; name: string }[];
  };
  type RecentMatchResult = {
    matchId: string;
    playedAt: string;
    stage: string;
    opponentDeckColor: string;
    myDeckColor: string;
    matchWon: boolean;
    gamesWon: number;
    gamesPlayed: number;
  };
  type MatchAnalysisSummary = {
    playerId: string;
    totals: {
      matchesPlayed: number;
      matchesWon: number;
      matchWinRate: number;
      gamesPlayed: number;
      gamesWon: number;
      gameWinRate: number;
    };
    byStage: Array<{
      stage: string;
      matchesPlayed: number;
      matchesWon: number;
      matchWinRate: number;
      gamesPlayed: number;
      gamesWon: number;
      gameWinRate: number;
    }>;
    deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
    recentForm: RecentMatchResult[];
    avgLoreInLostGames: number | null;
    avgLoreInWonGames: number | null;
    decksUsed: { _id: string; name: string }[];
  };

  let user = $state<MeUser | null>(null);
  let player = $state<MePlayer | null>(null);
  let playerStats = $state<PlayerStats | null>(null);
  let decksUsed = $state<{ _id: string; name: string }[]>([]);
  let filterDeckId = $state('');
  let teamName = $state('');
  let loading = $state(true);
  let savingTeam = $state(false);
  let error = $state('');
  type MatrixMode = 'matches' | 'games';
  let selectedMatrixMode = $state<MatrixMode>('matches');
  let playStyle = $state<PlayStyleSummary | null>(null);
  let matchAnalysis = $state<MatchAnalysisSummary | null>(null);
  let analyticsMatrixMode = $state<MatrixMode>('matches');

  const apiUrl = config.apiUrl ?? '/api';
  const token = $derived(getAuthToken());

  async function loadPlayerStats(matrixMode: MatrixMode, deckId?: string) {
    if (!player?._id) return;
    try {
      const params = new URLSearchParams();
      params.set('matrixMode', matrixMode);
      if (deckId?.trim()) params.set('deckId', deckId.trim());
      const statsRes = await fetch(
        `${apiUrl}/players/${player._id}${params.toString() ? `?${params}` : ''}`,
      );
      if (statsRes.ok) {
        const withStats = await statsRes.json();
        playerStats = withStats?.stats ?? null;
        decksUsed = Array.isArray(withStats?.decksUsed) ? withStats.decksUsed : [];
        selectedMatrixMode = matrixMode;
      }
    } catch {
      /* ignore stats load */
    }
  }

  async function onDeckFilterChange() {
    await loadPlayerStats(selectedMatrixMode, filterDeckId || undefined);
  }

  async function loadMe() {
    if (!token) {
      error = 'Not logged in.';
      loading = false;
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        error = 'Could not load profile.';
        loading = false;
        return;
      }
      const data = await res.json();
      user = data?.user ?? null;
      player = data?.player ?? null;
      teamName = player?.team ?? '';
      if (player?._id) {
        await loadPlayerStats('matches');
        const headers = { Authorization: `Bearer ${token}` };
        try {
          const [playStyleRes, matchAnalysisRes] = await Promise.all([
            fetch(`${apiUrl}/analytics/play-style/${player._id}`, { headers }),
            fetch(`${apiUrl}/analytics/matches/${player._id}?recentCount=10`, { headers }),
          ]);
          playStyle = playStyleRes.ok ? await playStyleRes.json() : null;
          matchAnalysis = matchAnalysisRes.ok ? await matchAnalysisRes.json() : null;
        } catch {
          playStyle = null;
          matchAnalysis = null;
        }
      } else {
        playerStats = null;
        playStyle = null;
        matchAnalysis = null;
      }
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }

  async function saveTeam() {
    if (!token) return;
    savingTeam = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ team: teamName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Could not update team.';
        return;
      }
      const data = await res.json();
      if (data?.player) player = data.player;
    } catch {
      error = 'Could not reach API.';
    } finally {
      savingTeam = false;
    }
  }

  onMount(loadMe);

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  }

  function formatRelativeDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      const d = new Date(s);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return 'Last week';
      return formatDate(s);
    } catch {
      return s ?? '–';
    }
  }

  const recentFormSummary = $derived(
    (() => {
      const list = matchAnalysis?.recentForm ?? [];
      if (list.length === 0) return null;
      const wins = list.filter((m) => m.matchWon).length;
      return { wins, losses: list.length - wins, total: list.length };
    })(),
  );
</script>

<svelte:head>
  <title>Me · Big Ink Lab</title>
</svelte:head>

<div class="page">
  <div class="card stack">
    <h1 class="card__title">My account</h1>

    {#if loading}
      <p class="muted">Loading…</p>
    {:else if error && !user}
      <p class="alert" role="alert">{error}</p>
    {:else if user}
      <dl class="stack me-dl">
        <div class="dl-row">
          <dt class="muted">Name</dt>
          <dd>{user.name || '–'}</dd>
        </div>
        <div class="dl-row">
          <dt class="muted">Email</dt>
          <dd>{user.email}</dd>
        </div>
        {#if player}
          <div class="dl-row">
            <dt class="muted">Player</dt>
            <dd>{player.name}</dd>
          </div>
          <div class="dl-row">
            <dt class="muted">Team name</dt>
            <dd>
              <div class="me-team-row">
                <input
                  type="text"
                  class="input"
                  bind:value={teamName}
                  placeholder="Team name"
                  aria-label="Team name"
                />
                <button
                  type="button"
                  class="btn btn--primary"
                  disabled={savingTeam}
                  onclick={saveTeam}
                >
                  {savingTeam ? 'Saving…' : 'Save'}
                </button>
              </div>
            </dd>
          </div>
        {/if}
      </dl>

      {#if error}
        <p class="alert" role="alert">{error}</p>
      {/if}
    {/if}
  </div>
  {#if player && playerStats}
    <div class="me-stats">
      <PlayerStatsOverview
        stats={playerStats}
        sectionTitle="My statistics"
        decksUsed={decksUsed}
        bind:filterDeckId
        onDeckFilterChange={onDeckFilterChange}
        bind:analysisMode={selectedMatrixMode}
        onMatrixModeChange={(mode) => loadPlayerStats(mode, filterDeckId || undefined)}
        emptyText="No matchup data yet."
      />
    </div>
  {:else if player}
    <div class="card">
      <p class="card__sub muted">No match data yet. Play some matches to see your statistics.</p>
    </div>
  {/if}

  {#if player && ((playStyle && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)) || (matchAnalysis && (matchAnalysis.totals.matchesPlayed > 0 || (matchAnalysis.recentForm?.length ?? 0) > 0)))}
    <div class="me-analytics">
      <div class="card stack me-analytics__section">
        <h2 class="me-analytics__title">Your analytics</h2>
        <p class="me-analytics__intro muted">
          Insights from your match history: how you play, your results, and recent form.
        </p>

        <!-- At a glance -->
        <div class="me-analytics__glance">
          {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
            <div class="me-analytics__glance-item">
              <span class="me-analytics__glance-value">{matchAnalysis.totals.matchWinRate}%</span>
              <span class="me-analytics__glance-label">Match win rate</span>
            </div>
            <div class="me-analytics__glance-item">
              <span class="me-analytics__glance-value">{matchAnalysis.totals.matchesPlayed}</span>
              <span class="me-analytics__glance-label">Matches played</span>
            </div>
          {/if}
          {#if playStyle?.preferredDeckColor}
            <div class="me-analytics__glance-item">
              <span class="me-analytics__glance-value">{playStyle.preferredDeckColor}</span>
              <span class="me-analytics__glance-label">Most played deck</span>
            </div>
          {/if}
          {#if recentFormSummary}
            <div class="me-analytics__glance-item me-analytics__glance-item--form">
              <span class="me-analytics__glance-value">
                <span class="me-analytics__form-wins">{recentFormSummary.wins}W</span>
                <span class="me-analytics__form-losses">{recentFormSummary.losses}L</span>
              </span>
              <span class="me-analytics__glance-label">Last {recentFormSummary.total} matches</span>
            </div>
          {/if}
        </div>

        <!-- Recent form first (most engaging) -->
        {#if matchAnalysis && matchAnalysis.recentForm && matchAnalysis.recentForm.length > 0}
          {@const recentList = matchAnalysis.recentForm}
          <div class="me-analytics__block">
            <h3 class="me-analytics__subtitle">Your last {recentList.length} matches</h3>
            <p class="me-analytics__hint muted">Tap a row to open the match.</p>
            <ul class="me-analytics__recent-list">
              {#each recentList as match (match.matchId)}
                <li class="me-analytics__recent-item">
                  <a href="/matches/{match.matchId}" class="me-analytics__recent-link">
                    <span class="me-analytics__recent-result" class:won={match.matchWon} class:lost={!match.matchWon}>
                      {match.matchWon ? 'W' : 'L'}
                    </span>
                    <span class="me-analytics__recent-matchup">{match.myDeckColor} vs {match.opponentDeckColor}</span>
                    <span class="me-analytics__recent-meta muted">{match.stage} · {match.gamesWon}/{match.gamesPlayed} games</span>
                    <span class="me-analytics__recent-date muted">{formatRelativeDate(match.playedAt)}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Play style -->
        {#if playStyle && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)}
          <div class="me-analytics__block">
            <h3 class="me-analytics__subtitle">How you play</h3>
            <p class="me-analytics__hint muted">
              Based on {playStyle.matchesAnalyzed} matches and {playStyle.gamesAnalyzed} games.
            </p>
            {#if playStyle.preferredDeckColor || playStyle.bestPerformingDeckColor}
              <div class="me-analytics__row">
                {#if playStyle.preferredDeckColor}
                  <div class="me-analytics__item">
                    <span class="me-analytics__value">{playStyle.preferredDeckColor}</span>
                    <span class="me-analytics__label muted">Most played deck</span>
                  </div>
                {/if}
                {#if playStyle.bestPerformingDeckColor}
                  <div class="me-analytics__item">
                    <span class="me-analytics__value">{playStyle.bestPerformingDeckColor}</span>
                    <span class="me-analytics__label muted">Best win rate</span>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="me-analytics__block me-analytics__block--nested">
              <h4 class="me-analytics__small-title">When you go first vs second</h4>
              <p class="muted me-analytics__description">
                Win rate when you <strong>start the game</strong> (on the play) vs when you <strong>go second</strong> (on the draw).
              </p>
              <table class="me-analytics__table" aria-label="Win rate by starting player">
                <thead>
                  <tr>
                    <th scope="col"></th>
                    <th scope="col">You go first</th>
                    <th scope="col">You go second</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" class="me-analytics__row-header">Win rate</th>
                    <td>{playStyle.starterWinRate}%</td>
                    <td>{playStyle.nonStarterWinRate}%</td>
                  </tr>
                </tbody>
              </table>
              {#if playStyle.starterAdvantageDelta != null && playStyle.starterAdvantageDelta !== 0}
                <p class="muted me-analytics__delta">
                  You perform {playStyle.starterAdvantageDelta > 0 ? 'better' : 'worse'} when you start: {playStyle.starterAdvantageDelta > 0 ? '+' : ''}{playStyle.starterAdvantageDelta}% win rate.
                </p>
              {/if}
            </div>
            {#if playStyle.stageMix?.length > 0}
              <details class="me-analytics__details">
                <summary>Where you play (by stage)</summary>
                <table class="me-analytics__table" aria-label="Matches by stage">
                  <thead>
                    <tr>
                      <th scope="col">Stage</th>
                      <th scope="col">Matches</th>
                      <th scope="col">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each playStyle.stageMix as row (row.stage)}
                      <tr>
                        <th scope="row" class="me-analytics__row-header">{row.stage}</th>
                        <td>{row.count}</td>
                        <td>{row.percentage}%</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </details>
            {/if}
            {#if playStyle.deckColorStats?.length > 0}
              <details class="me-analytics__details">
                <summary>Stats by deck color</summary>
                <table class="me-analytics__table me-analytics__table--wide" aria-label="Stats by deck color">
                  <thead>
                    <tr>
                      <th scope="col">Deck</th>
                      <th scope="col">Matches</th>
                      <th scope="col">Match WR</th>
                      <th scope="col">Games</th>
                      <th scope="col">Game WR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each playStyle.deckColorStats as row (row.deckColor)}
                      <tr>
                        <th scope="row" class="me-analytics__row-header">{row.deckColor}</th>
                        <td>{row.matchesPlayed}</td>
                        <td>{row.matchWinRate}%</td>
                        <td>{row.gamesPlayed}</td>
                        <td>{row.gameWinRate}%</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </details>
            {/if}
            {#if playStyle.avgLoreWhenWinning != null || playStyle.avgLoreWhenLosing != null}
              <div class="me-analytics__row">
                {#if playStyle.avgLoreWhenWinning != null}
                  <div class="me-analytics__item">
                    <span class="me-analytics__value">{playStyle.avgLoreWhenWinning.toFixed(1)}</span>
                    <span class="me-analytics__label muted">Avg lore when you win</span>
                  </div>
                {/if}
                {#if playStyle.avgLoreWhenLosing != null}
                  <div class="me-analytics__item">
                    <span class="me-analytics__value">{playStyle.avgLoreWhenLosing.toFixed(1)}</span>
                    <span class="me-analytics__label muted">Avg lore when you lose</span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Match analysis totals & breakdowns -->
        {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
          <div class="me-analytics__block">
            <h3 class="me-analytics__subtitle">Overall results</h3>
            <div class="me-analytics__row">
              <div class="me-analytics__item">
                <span class="me-analytics__value">{matchAnalysis.totals.matchesPlayed}</span>
                <span class="me-analytics__label muted">Matches</span>
              </div>
              <div class="me-analytics__item">
                <span class="me-analytics__value">{matchAnalysis.totals.matchWinRate}%</span>
                <span class="me-analytics__label muted">Match win rate</span>
              </div>
              <div class="me-analytics__item">
                <span class="me-analytics__value">{matchAnalysis.totals.gamesPlayed}</span>
                <span class="me-analytics__label muted">Games</span>
              </div>
              <div class="me-analytics__item">
                <span class="me-analytics__value">{matchAnalysis.totals.gameWinRate}%</span>
                <span class="me-analytics__label muted">Game win rate</span>
              </div>
            </div>
          </div>
          {#if matchAnalysis.byStage?.length > 0}
            <details class="me-analytics__details">
              <summary>Results by stage</summary>
              <table class="me-analytics__table me-analytics__table--wide" aria-label="Stats by stage">
                <thead>
                  <tr>
                    <th scope="col">Stage</th>
                    <th scope="col">Matches</th>
                    <th scope="col">Match WR</th>
                    <th scope="col">Games</th>
                    <th scope="col">Game WR</th>
                  </tr>
                </thead>
                <tbody>
                  {#each matchAnalysis.byStage as row (row.stage)}
                    <tr>
                      <th scope="row" class="me-analytics__row-header">{row.stage}</th>
                      <td>{row.matchesPlayed}</td>
                      <td>{row.matchWinRate}%</td>
                      <td>{row.gamesPlayed}</td>
                      <td>{row.gameWinRate}%</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </details>
          {/if}
          {#if matchAnalysis.deckColorMatrix && Object.keys(matchAnalysis.deckColorMatrix).length > 0}
            <div class="me-analytics__block me-analytics__matrix">
              <MatchupStatistics
                matrix={matchAnalysis.deckColorMatrix}
                bind:analysisMode={analyticsMatrixMode}
                title="Deck color matchups"
                emptyText="No matchup data yet."
              />
            </div>
          {/if}
          {#if matchAnalysis.avgLoreInWonGames != null || matchAnalysis.avgLoreInLostGames != null}
            <div class="me-analytics__row">
              {#if matchAnalysis.avgLoreInWonGames != null}
                <div class="me-analytics__item">
                  <span class="me-analytics__value">{matchAnalysis.avgLoreInWonGames.toFixed(1)}</span>
                  <span class="me-analytics__label muted">Avg lore in wins</span>
                </div>
              {/if}
              {#if matchAnalysis.avgLoreInLostGames != null}
                <div class="me-analytics__item">
                  <span class="me-analytics__value">{matchAnalysis.avgLoreInLostGames.toFixed(1)}</span>
                  <span class="me-analytics__label muted">Avg lore in losses</span>
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .me-dl {
    margin: var(--space-md) 0;
  }
  .me-dl .dl-row {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  .me-dl dt {
    min-width: 5rem;
  }
  .me-team-row {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    flex-wrap: wrap;
  }
  .me-team-row .input {
    min-width: 12rem;
  }

  .me-stats {
    margin-top: var(--space-lg);
  }

  .me-analytics {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-top: var(--space-lg);
  }

  .me-analytics__section {
    width: 100%;
  }

  .me-analytics__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .me-analytics__intro {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .me-analytics__glance {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-lg);
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--border);
  }

  .me-analytics__glance-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .me-analytics__glance-value {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .me-analytics__glance-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .me-analytics__glance-item--form .me-analytics__glance-value {
    display: flex;
    gap: var(--space-sm);
  }

  .me-analytics__form-wins {
    color: var(--color-success, #16a34a);
    font-weight: 700;
  }

  .me-analytics__form-losses {
    color: var(--color-error, #dc2626);
    font-weight: 700;
  }

  .me-analytics__subtitle {
    margin: 0 0 var(--space-xs) 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .me-analytics__hint {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.875rem;
  }

  .me-analytics__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md) var(--space-lg);
  }

  .me-analytics__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .me-analytics__value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .me-analytics__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .me-analytics__block {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .me-analytics__block h3,
  .me-analytics__block .me-analytics__subtitle {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .me-analytics__block--nested {
    margin-top: var(--space-sm);
    padding-left: 0;
  }

  .me-analytics__small-title {
    margin: 0 0 var(--space-xs) 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .me-analytics__details {
    margin-top: var(--space-sm);
  }

  .me-analytics__details summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    padding: var(--space-xs) 0;
    list-style: none;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .me-analytics__details summary::-webkit-details-marker {
    display: none;
  }

  .me-analytics__details summary::before {
    content: '▶';
    font-size: 0.7rem;
    opacity: 0.7;
    transition: transform 0.2s ease;
  }

  .me-analytics__details[open] summary::before {
    transform: rotate(90deg);
  }

  .me-analytics__details .me-analytics__table {
    margin-top: var(--space-sm);
  }

  .me-analytics__description {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .me-analytics__delta {
    margin: 0;
    font-size: 0.9rem;
  }

  .me-analytics__table {
    width: 100%;
    max-width: 24rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .me-analytics__table--wide {
    max-width: none;
  }

  .me-analytics__table th,
  .me-analytics__table td {
    border: 1px solid var(--border);
    padding: var(--space-sm) var(--space-md);
    text-align: left;
  }

  .me-analytics__table thead th {
    font-weight: 700;
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.06));
  }

  .me-analytics__table th:not(.me-analytics__row-header) {
    text-align: center;
  }

  .me-analytics__table td {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .me-analytics__row-header {
    font-weight: 600;
    text-align: left;
  }

  .me-analytics__matrix {
    min-width: 0;
    overflow: hidden;
  }

  .me-analytics__recent-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .me-analytics__recent-item {
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }

  .me-analytics__recent-item:last-child {
    border-bottom: none;
  }

  .me-analytics__recent-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) 0;
    text-decoration: none;
    color: inherit;
    border-radius: 6px;
    margin: 0 calc(-1 * var(--space-sm));
    padding-left: var(--space-sm);
    padding-right: var(--space-sm);
    transition: background 0.15s ease;
  }

  .me-analytics__recent-link:hover {
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.05));
  }

  .me-analytics__recent-matchup {
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  .me-analytics__recent-meta {
    flex-shrink: 0;
  }

  .me-analytics__recent-date {
    flex-shrink: 0;
    font-size: 0.85rem;
  }

  .me-analytics__recent-result {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .me-analytics__recent-result.won {
    background: var(--color-success-bg, rgba(34, 197, 94, 0.2));
    color: var(--color-success, #16a34a);
  }

  .me-analytics__recent-result.lost {
    background: var(--color-error-bg, rgba(239, 68, 68, 0.2));
    color: var(--color-error, #dc2626);
  }
</style>
