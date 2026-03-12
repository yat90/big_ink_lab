<script lang="ts">
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import PlayerStatsOverview, { type PlayerStats } from '$lib/PlayerStatsOverview.svelte';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';

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

  type TabId = 'overview' | 'matchups' | 'play-style' | 'results';
  type MatrixMode = 'matches' | 'games';

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'matchups', label: 'Matchups' },
    { id: 'play-style', label: 'Play style' },
    { id: 'results', label: 'Results' },
  ];

  let player = $state<MePlayer | null>(null);
  let playerStats = $state<PlayerStats | null>(null);
  let decksUsed = $state<{ _id: string; name: string }[]>([]);
  let filterDeckId = $state('');
  let playStyle = $state<PlayStyleSummary | null>(null);
  let matchAnalysis = $state<MatchAnalysisSummary | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state<TabId>('overview');
  let selectedMatrixMode = $state<MatrixMode>('matches');
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
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (statsRes.ok) {
        const withStats = await statsRes.json();
        playerStats = withStats?.stats ?? null;
        decksUsed = Array.isArray(withStats?.decksUsed) ? withStats.decksUsed : [];
        selectedMatrixMode = matrixMode;
      }
    } catch {
      /* ignore */
    }
  }

  async function onDeckFilterChange() {
    await loadPlayerStats(selectedMatrixMode, filterDeckId || undefined);
  }

  async function loadStatistics() {
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
      player = data?.player ?? null;
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

  const hasAnyStats = $derived(
    (playerStats != null) ||
    (playStyle != null && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)) ||
    (matchAnalysis != null && (matchAnalysis.totals.matchesPlayed > 0 || (matchAnalysis.recentForm?.length ?? 0) > 0)),
  );

  onMount(loadStatistics);
</script>

<svelte:head>
  <title>My statistics · Big Ink Lab</title>
</svelte:head>

<div class="page stats-page">
  <div class="card stack stats-page__card">
    <h1 class="stats-page__title">My statistics</h1>
    <p class="stats-page__intro muted">
      Your performance, play style, and matchup data in one place. Use the tabs to switch between categories.
    </p>

    {#if loading}
      <p class="muted">Loading…</p>
    {:else if error && !player}
      <p class="alert" role="alert">{error}</p>
    {:else if !player}
      <p class="muted">Link a player to your account to see statistics.</p>
    {:else if !hasAnyStats}
      <p class="muted">No match data yet. Play some matches to see your statistics here.</p>
    {:else}
      <div class="stats-page__tabs" role="tablist" aria-label="Statistics categories">
        {#each TABS as tab (tab.id)}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="panel-{tab.id}"
            id="tab-{tab.id}"
            class="stats-page__tab"
            class:stats-page__tab--active={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="stats-page__panels">
        <!-- Overview -->
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          class="stats-page__panel"
          hidden={activeTab !== 'overview'}
        >
          <div class="stats-page__glance">
            {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
              <div class="stats-page__glance-item">
                <span class="stats-page__glance-value">{matchAnalysis.totals.matchWinRate}%</span>
                <span class="stats-page__glance-label">Match win rate</span>
              </div>
              <div class="stats-page__glance-item">
                <span class="stats-page__glance-value">{matchAnalysis.totals.matchesPlayed}</span>
                <span class="stats-page__glance-label">Matches played</span>
              </div>
              <div class="stats-page__glance-item">
                <span class="stats-page__glance-value">{matchAnalysis.totals.gamesPlayed}</span>
                <span class="stats-page__glance-label">Games played</span>
              </div>
            {/if}
            {#if playStyle?.preferredDeckColor}
              <div class="stats-page__glance-item">
                <span class="stats-page__glance-value">{playStyle.preferredDeckColor}</span>
                <span class="stats-page__glance-label">Most played deck</span>
              </div>
            {/if}
            {#if recentFormSummary}
              <div class="stats-page__glance-item stats-page__glance-item--form">
                <span class="stats-page__glance-value">
                  <span class="stats-page__form-wins">{recentFormSummary.wins}W</span>
                  <span class="stats-page__form-losses">{recentFormSummary.losses}L</span>
                </span>
                <span class="stats-page__glance-label">Last {recentFormSummary.total} matches</span>
              </div>
            {/if}
          </div>
          {#if playerStats}
            <div class="stats-page__overview-block">
              <h2 class="stats-page__subtitle">Quick numbers</h2>
              <div class="stats-page__row">
                <div class="stats-page__item">
                  <span class="stats-page__value">{playerStats.matchesWon} / {playerStats.matchesPlayed}</span>
                  <span class="stats-page__label muted">Matches won</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{playerStats.gamesWon} / {playerStats.gamesPlayed}</span>
                  <span class="stats-page__label muted">Games won</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{playerStats.starterWinRate}%</span>
                  <span class="stats-page__label muted">Win rate when you go first</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{playerStats.nonStarterWinRate}%</span>
                  <span class="stats-page__label muted">Win rate when you go second</span>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Matchups -->
        <div
          id="panel-matchups"
          role="tabpanel"
          aria-labelledby="tab-matchups"
          class="stats-page__panel"
          hidden={activeTab !== 'matchups'}
        >
          {#if playerStats}
            <PlayerStatsOverview
              stats={playerStats}
              sectionTitle="Deck color matchups"
              decksUsed={decksUsed}
              bind:filterDeckId
              onDeckFilterChange={onDeckFilterChange}
              bind:analysisMode={selectedMatrixMode}
              onMatrixModeChange={(mode) => loadPlayerStats(mode, filterDeckId || undefined)}
              emptyText="No matchup data yet."
            />
          {/if}
          {#if matchAnalysis?.deckColorMatrix && Object.keys(matchAnalysis.deckColorMatrix).length > 0}
            <div class="stats-page__matrix-block">
              <MatchupStatistics
                matrix={matchAnalysis.deckColorMatrix}
                bind:analysisMode={analyticsMatrixMode}
                title="Your deck vs opponent deck"
                emptyText="No matchup data yet."
              />
            </div>
          {/if}
        </div>

        <!-- Play style -->
        <div
          id="panel-play-style"
          role="tabpanel"
          aria-labelledby="tab-play-style"
          class="stats-page__panel"
          hidden={activeTab !== 'play-style'}
        >
          {#if playStyle && (playStyle.matchesAnalyzed > 0 || playStyle.gamesAnalyzed > 0)}
            <p class="muted stats-page__hint">
              Based on {playStyle.matchesAnalyzed} matches and {playStyle.gamesAnalyzed} games.
            </p>
            {#if playStyle.preferredDeckColor || playStyle.bestPerformingDeckColor}
              <div class="stats-page__row">
                {#if playStyle.preferredDeckColor}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{playStyle.preferredDeckColor}</span>
                    <span class="stats-page__label muted">Most played deck</span>
                  </div>
                {/if}
                {#if playStyle.bestPerformingDeckColor}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{playStyle.bestPerformingDeckColor}</span>
                    <span class="stats-page__label muted">Best win rate (min 5 games)</span>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="stats-page__block">
              <h2 class="stats-page__subtitle">When you go first vs second</h2>
              <p class="muted stats-page__description">
                Win rate when you <strong>start the game</strong> vs when you <strong>go second</strong>.
              </p>
              <table class="stats-page__table" aria-label="Win rate by starting player">
                <thead>
                  <tr>
                    <th scope="col"></th>
                    <th scope="col">You go first</th>
                    <th scope="col">You go second</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" class="stats-page__row-header">Win rate</th>
                    <td>{playStyle.starterWinRate}%</td>
                    <td>{playStyle.nonStarterWinRate}%</td>
                  </tr>
                </tbody>
              </table>
              {#if playStyle.starterAdvantageDelta != null && playStyle.starterAdvantageDelta !== 0}
                <p class="muted stats-page__delta">
                  You perform {playStyle.starterAdvantageDelta > 0 ? 'better' : 'worse'} when you start: {playStyle.starterAdvantageDelta > 0 ? '+' : ''}{playStyle.starterAdvantageDelta}% win rate.
                </p>
              {/if}
            </div>
            {#if playStyle.stageMix?.length > 0}
              <div class="stats-page__block">
                <h2 class="stats-page__subtitle">Where you play (by stage)</h2>
                <table class="stats-page__table stats-page__table--wide" aria-label="Matches by stage">
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
                        <th scope="row" class="stats-page__row-header">{row.stage}</th>
                        <td>{row.count}</td>
                        <td>{row.percentage}%</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
            {#if playStyle.deckColorStats?.length > 0}
              <div class="stats-page__block">
                <h2 class="stats-page__subtitle">Stats by deck color</h2>
                <table class="stats-page__table stats-page__table--wide" aria-label="Stats by deck color">
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
                        <th scope="row" class="stats-page__row-header">{row.deckColor}</th>
                        <td>{row.matchesPlayed}</td>
                        <td>{row.matchWinRate}%</td>
                        <td>{row.gamesPlayed}</td>
                        <td>{row.gameWinRate}%</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
            {#if playStyle.avgLoreWhenWinning != null || playStyle.avgLoreWhenLosing != null}
              <div class="stats-page__row">
                {#if playStyle.avgLoreWhenWinning != null}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{playStyle.avgLoreWhenWinning.toFixed(1)}</span>
                    <span class="stats-page__label muted">Avg lore when you win</span>
                  </div>
                {/if}
                {#if playStyle.avgLoreWhenLosing != null}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{playStyle.avgLoreWhenLosing.toFixed(1)}</span>
                    <span class="stats-page__label muted">Avg lore when you lose</span>
                  </div>
                {/if}
              </div>
            {/if}
          {:else}
            <p class="muted">No play-style data yet. Play more matches to see how you play.</p>
          {/if}
        </div>

        <!-- Results -->
        <div
          id="panel-results"
          role="tabpanel"
          aria-labelledby="tab-results"
          class="stats-page__panel"
          hidden={activeTab !== 'results'}
        >
          {#if matchAnalysis && matchAnalysis.totals.matchesPlayed > 0}
            <div class="stats-page__block">
              <h2 class="stats-page__subtitle">Overall results</h2>
              <div class="stats-page__row">
                <div class="stats-page__item">
                  <span class="stats-page__value">{matchAnalysis.totals.matchesPlayed}</span>
                  <span class="stats-page__label muted">Matches</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{matchAnalysis.totals.matchWinRate}%</span>
                  <span class="stats-page__label muted">Match win rate</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{matchAnalysis.totals.gamesPlayed}</span>
                  <span class="stats-page__label muted">Games</span>
                </div>
                <div class="stats-page__item">
                  <span class="stats-page__value">{matchAnalysis.totals.gameWinRate}%</span>
                  <span class="stats-page__label muted">Game win rate</span>
                </div>
              </div>
            </div>
            {#if matchAnalysis.byStage?.length > 0}
              <div class="stats-page__block">
                <h2 class="stats-page__subtitle">Results by stage</h2>
                <table class="stats-page__table stats-page__table--wide" aria-label="Stats by stage">
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
                        <th scope="row" class="stats-page__row-header">{row.stage}</th>
                        <td>{row.matchesPlayed}</td>
                        <td>{row.matchWinRate}%</td>
                        <td>{row.gamesPlayed}</td>
                        <td>{row.gameWinRate}%</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
            {#if matchAnalysis.avgLoreInWonGames != null || matchAnalysis.avgLoreInLostGames != null}
              <div class="stats-page__row">
                {#if matchAnalysis.avgLoreInWonGames != null}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{matchAnalysis.avgLoreInWonGames.toFixed(1)}</span>
                    <span class="stats-page__label muted">Avg lore in wins</span>
                  </div>
                {/if}
                {#if matchAnalysis.avgLoreInLostGames != null}
                  <div class="stats-page__item">
                    <span class="stats-page__value">{matchAnalysis.avgLoreInLostGames.toFixed(1)}</span>
                    <span class="stats-page__label muted">Avg lore in losses</span>
                  </div>
                {/if}
              </div>
            {/if}
            {#if matchAnalysis.recentForm && matchAnalysis.recentForm.length > 0}
              {@const recentList = matchAnalysis.recentForm}
              <div class="stats-page__block">
                <h2 class="stats-page__subtitle">Your last {recentList.length} matches</h2>
                <p class="stats-page__hint muted">Tap a row to open the match.</p>
                <ul class="stats-page__recent-list">
                  {#each recentList as match (match.matchId)}
                    <li class="stats-page__recent-item">
                      <a href="/matches/{match.matchId}" class="stats-page__recent-link">
                        <span class="stats-page__recent-result" class:won={match.matchWon} class:lost={!match.matchWon}>
                          {match.matchWon ? 'W' : 'L'}
                        </span>
                        <span class="stats-page__recent-matchup">{match.myDeckColor} vs {match.opponentDeckColor}</span>
                        <span class="stats-page__recent-meta muted">{match.stage} · {match.gamesWon}/{match.gamesPlayed} games</span>
                        <span class="stats-page__recent-date muted">{formatRelativeDate(match.playedAt)}</span>
                      </a>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          {:else}
            <p class="muted">No match results yet. Play some matches to see results here.</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .stats-page {
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 960px) {
    .stats-page {
      max-width: min(1200px, 100%);
    }
  }

  .stats-page__card {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .stats-page__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .stats-page__intro {
    margin: 0 0 var(--space-md) 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .stats-page__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-lg);
  }

  .stats-page__tab {
    padding: var(--space-sm) var(--space-md);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--muted);
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .stats-page__tab:hover {
    color: var(--text);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.05));
  }

  .stats-page__tab--active {
    color: var(--text);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.08));
  }

  .stats-page__panels {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .stats-page__panel {
    min-width: 0;
    max-width: 100%;
  }

  .stats-page__panel[hidden] {
    display: none;
  }

  .stats-page__glance {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-lg);
    padding: var(--space-md) 0;
    margin-bottom: var(--space-lg);
    border-bottom: 1px solid var(--border);
  }

  .stats-page__glance-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .stats-page__glance-value {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .stats-page__glance-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .stats-page__glance-item--form .stats-page__glance-value {
    display: flex;
    gap: var(--space-sm);
  }

  .stats-page__form-wins {
    color: var(--color-success, #16a34a);
    font-weight: 700;
  }

  .stats-page__form-losses {
    color: var(--color-error, #dc2626);
    font-weight: 700;
  }

  .stats-page__subtitle {
    margin: 0 0 var(--space-sm) 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .stats-page__hint {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.875rem;
  }

  .stats-page__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md) var(--space-lg);
  }

  .stats-page__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .stats-page__value {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .stats-page__label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .stats-page__block {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .stats-page__overview-block {
    margin-top: var(--space-md);
  }

  .stats-page__description {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .stats-page__delta {
    margin: 0;
    font-size: 0.9rem;
  }

  .stats-page__matrix-block {
    margin-top: var(--space-lg);
    min-width: 0;
    overflow-x: auto;
  }

  .stats-page__table {
    width: 100%;
    max-width: 24rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .stats-page__table--wide {
    max-width: none;
  }

  .stats-page__table th,
  .stats-page__table td {
    border: 1px solid var(--border);
    padding: var(--space-sm) var(--space-md);
    text-align: left;
  }

  .stats-page__table thead th {
    font-weight: 700;
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.06));
  }

  .stats-page__table th:not(.stats-page__row-header) {
    text-align: center;
  }

  .stats-page__table td {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .stats-page__row-header {
    font-weight: 600;
    text-align: left;
  }

  .stats-page__recent-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .stats-page__recent-item {
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }

  .stats-page__recent-item:last-child {
    border-bottom: none;
  }

  .stats-page__recent-link {
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

  .stats-page__recent-link:hover {
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.05));
  }

  .stats-page__recent-matchup {
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  .stats-page__recent-meta {
    flex-shrink: 0;
  }

  .stats-page__recent-date {
    flex-shrink: 0;
    font-size: 0.85rem;
  }

  .stats-page__recent-result {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .stats-page__recent-result.won {
    background: var(--color-success-bg, rgba(34, 197, 94, 0.2));
    color: var(--color-success, #16a34a);
  }

  .stats-page__recent-result.lost {
    background: var(--color-error-bg, rgba(239, 68, 68, 0.2));
    color: var(--color-error, #dc2626);
  }
</style>
