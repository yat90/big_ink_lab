<script lang="ts">
  import { config } from '$lib/config';
  import { type Game } from '$lib/matches';
  import { onMount } from 'svelte';

  type Player = { _id: string; name: string; team: string };
  type Match = {
    _id: string;
    stage?: string;
    tournamentName?: string;
    playedAt?: string;
    p1?: Player | string;
    p2?: Player | string;
    matchWinner?: Player | string;
    games?: Game[];
  };

  let matches = $state<Match[]>([]);
  let loading = $state(true);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  function playerTeam(p: Player | string | undefined): string {
    if (!p || typeof p === 'string') return '';
    return p.team?.trim() ?? '';
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/matches`);
      if (!res.ok) {
        error = 'Failed to load matches';
        return;
      }
      matches = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="page">
  {#if loading}
    <div class="card">
      <p class="muted">Loading…</p>
    </div>
  {:else if error}
    <div class="card">
      <p class="alert">{error}</p>
    </div>
  {:else if matches.length === 0}
    <div class="card stack">
      <h2 class="card__title">No matches yet</h2>
      <p class="card__sub">Create your first match.</p>
      <a href="/matches/new" class="btn btn--primary" style="align-self: flex-start; margin-top: 8px;">
        New match
      </a>
    </div>
  {:else}
    <div class="row" style="justify-content: space-between; margin-bottom: 16px;">
      <h2 class="card__title" style="margin: 0;">Matches</h2>
      <a href="/matches/new" class="btn btn--primary">New match</a>
    </div>
    <div class="stack">
      {#each matches as match}
        <a href="/matches/{match._id}" class="card playercard" style="text-decoration: none; color: inherit;">
          <div class="playercard__name">
            {playerName(match.p1)} vs {playerName(match.p2)}
          </div>
          {#if playerTeam(match.p1) || playerTeam(match.p2)}
            <div class="playercard__teams">
              {playerTeam(match.p1) || '–'} vs {playerTeam(match.p2) || '–'}
            </div>
          {/if}
          <div class="playercard__meta">
            {formatDate(match.playedAt)} · {match.stage ?? '–'} {#if match.tournamentName}{match.tournamentName}{/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
