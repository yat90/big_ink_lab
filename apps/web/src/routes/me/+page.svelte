<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import MatchupStatistics from '$lib/MatchupStatistics.svelte';

  type MeUser = { id: string; email: string; name?: string };
  type MePlayer = { _id: string; name: string; team: string };

  type DeckColorMatrixCell = { played: number; won: number };
  type DeckColorMatrix = Record<string, Record<string, DeckColorMatrixCell>>;

  type PlayerStats = {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchWinRate: number;
    gamesPlayed: number;
    gamesWon: number;
    gameWinRate: number;
    gamesAsStarter: number;
    gamesWonAsStarter: number;
    starterWinRate: number;
    gamesNotStarter: number;
    gamesWonNotStarter: number;
    nonStarterWinRate: number;
    deckColorMatrix?: DeckColorMatrix;
  };

  let user = $state<MeUser | null>(null);
  let player = $state<MePlayer | null>(null);
  let playerStats = $state<PlayerStats | null>(null);
  let teamName = $state('');
  let loading = $state(true);
  let savingTeam = $state(false);
  let error = $state('');
  type MatrixMode = 'matches' | 'games';
  let selectedMatrixMode = $state<MatrixMode>('matches');

  const apiUrl = config.apiUrl ?? '/api';
  const token = $derived(getAuthToken());

  async function loadPlayerStats(matrixMode: MatrixMode) {
    if (!player?._id) return;
    try {
      const statsRes = await fetch(`${apiUrl}/players/${player._id}?matrixMode=${matrixMode}`);
      if (statsRes.ok) {
        const withStats = await statsRes.json();
        playerStats = withStats?.stats ?? null;
        selectedMatrixMode = matrixMode;
      }
    } catch {
      /* ignore stats load */
    }
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
      } else {
        playerStats = null;
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
    <div class="me-stats card">
      <h2 class="me-stats__title">My statistics</h2>

      <section class="me-stats__block" aria-labelledby="me-stats-matches">
        <h3 id="me-stats-matches" class="me-stats__block-title">Matches</h3>
        <p class="me-stats__summary">
          <span class="me-stats__record"
            >{playerStats.matchesWon} wins, {playerStats.matchesLost} losses</span
          >
          <span class="me-stats__rate">{playerStats.matchWinRate}% win rate</span>
        </p>
        <p class="me-stats__meta muted">{playerStats.matchesPlayed} matches played</p>
      </section>

      <section class="me-stats__block" aria-labelledby="me-stats-games">
        <h3 id="me-stats-games" class="me-stats__block-title">Individual games</h3>
        <p class="me-stats__summary">
          <span class="me-stats__record"
            >{playerStats.gamesWon} wins, {playerStats.gamesPlayed - playerStats.gamesWon}
            losses</span
          >
          <span class="me-stats__rate">{playerStats.gameWinRate}% win rate</span>
        </p>
        <p class="me-stats__meta muted">{playerStats.gamesPlayed} games played</p>
      </section>

      <section class="me-stats__block me-stats__block--split" aria-labelledby="me-stats-starter">
        <h3 id="me-stats-starter" class="me-stats__block-title">When I start vs when I don’t</h3>
        <div class="me-stats__twocol">
          <div class="me-stats__half">
            <span class="me-stats__half-label">When I start</span>
            <span class="me-stats__half-value"
              >{playerStats.gamesWonAsStarter}–{playerStats.gamesAsStarter -
                playerStats.gamesWonAsStarter}</span
            >
            <span class="me-stats__half-rate muted">{playerStats.starterWinRate}%</span>
          </div>
          <div class="me-stats__half">
            <span class="me-stats__half-label">When I don’t start</span>
            <span class="me-stats__half-value"
              >{playerStats.gamesWonNotStarter}–{playerStats.gamesNotStarter -
                playerStats.gamesWonNotStarter}</span
            >
            <span class="me-stats__half-rate muted">{playerStats.nonStarterWinRate}%</span>
          </div>
        </div>
      </section>
    </div>

    {#if playerStats.deckColorMatrix && Object.keys(playerStats.deckColorMatrix).length > 0}
      <div class="card me-stats__matrix-card">
        <MatchupStatistics
          matrix={playerStats.deckColorMatrix}
          bind:analysisMode={selectedMatrixMode}
          onchange={(mode) => loadPlayerStats(mode)}
          title="Deck color matchups"
          emptyText="No matchup data yet."
        />
      </div>
    {/if}
  {:else if player}
    <div class="card">
      <p class="card__sub muted">No match data yet. Play some matches to see your statistics.</p>
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
  .me-stats__matrix-card {
    margin-top: var(--space-lg);
  }
  .me-stats__title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 var(--space-md);
  }
  .me-stats__block {
    margin-bottom: var(--space-lg);
  }
  .me-stats__block:last-child {
    margin-bottom: 0;
  }
  .me-stats__block-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 var(--space-xs);
    color: var(--muted);
  }
  .me-stats__summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5em;
    margin: 0;
    font-size: 1.1rem;
  }
  .me-stats__record {
    font-weight: 700;
  }
  .me-stats__rate {
    font-weight: 600;
  }
  .me-stats__meta {
    margin: var(--space-xs) 0 0;
    font-size: 0.85rem;
  }
  .me-stats__block--split .me-stats__twocol {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-top: var(--space-sm);
  }
  .me-stats__half {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35em;
    min-width: 10rem;
  }
  .me-stats__half-label {
    width: 100%;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .me-stats__half-value {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .me-stats__half-rate {
    font-size: 0.9rem;
  }
</style>
