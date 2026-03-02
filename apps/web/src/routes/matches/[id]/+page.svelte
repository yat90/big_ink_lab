<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { STAGE_OPTIONS, DECK_COLOR_OPTIONS } from '$lib/matches';

  type Player = { _id: string; name: string; team: string };
  type Match = {
    _id: string;
    stage?: string;
    tournamentName?: string;
    playedAt?: string;
    round?: number;
    p1?: Player | string;
    p2?: Player | string;
    p1DeckColor?: string;
    p2DeckColor?: string;
    matchWinner?: Player | string;
    games?: Array<{ p1Score: number; p2Score: number }>;
    notes?: string;
  };

  const id = $page.params.id;
  let match = $state<Match | null>(null);
  let players = $state<Player[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let deleting = $state(false);

  const apiUrl = config.apiUrl ?? '/api';

  function playerName(p: Player | string | undefined): string {
    if (!p) return '–';
    return typeof p === 'string' ? p : p.name ?? '–';
  }

  function formatDate(s: string | undefined): string {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  onMount(async () => {
    try {
      const [matchRes, playersRes] = await Promise.all([
        fetch(`${apiUrl}/matches/${id}`),
        fetch(`${apiUrl}/players`),
      ]);
      if (!matchRes.ok) {
        error = 'Match not found';
        loading = false;
        return;
      }
      match = await matchRes.json();
      if (playersRes.ok) players = await playersRes.json();
    } catch {
      error = 'Could not load match.';
    } finally {
      loading = false;
    }
  });

  async function onUpdate(e: Event) {
    e.preventDefault();
    if (!match) return;
    saving = true;
    error = '';
    try {
      const p1Id = typeof match.p1 === 'object' && match.p1 ? match.p1._id : match.p1;
      const p2Id = typeof match.p2 === 'object' && match.p2 ? match.p2._id : match.p2;
      const winnerId = typeof match.matchWinner === 'object' && match.matchWinner ? match.matchWinner._id : match.matchWinner;
      const body = {
        ...match,
        p1: p1Id,
        p2: p2Id,
        matchWinner: winnerId,
      };
      const res = await fetch(`${apiUrl}/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Update failed';
        saving = false;
        return;
      }
      match = await res.json();
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }

  async function onDelete() {
    if (!confirm('Delete this match?')) return;
    deleting = true;
    try {
      const res = await fetch(`${apiUrl}/matches/${id}`, { method: 'DELETE' });
      if (res.ok) await goto('/matches');
      else error = 'Delete failed';
    } catch {
      error = 'Could not reach API.';
    } finally {
      deleting = false;
    }
  }
</script>

<div class="page">
  {#if loading}
    <div class="card">
      <p class="muted">Loading…</p>
    </div>
  {:else if error && !match}
    <div class="card">
      <p class="alert">{error}</p>
      <a href="/matches" class="btn">Back to matches</a>
    </div>
  {:else if match}
    <div class="card stack">
      <h2 class="card__title">Match</h2>
      <p class="card__sub">{playerName(match.p1)} vs {playerName(match.p2)} · {formatDate(match.playedAt)}</p>

      <dl class="stack" style="margin-top: 12px;">
        <div><dt class="muted" style="font-size: 0.85rem;">Stage</dt><dd>{match.stage ?? '–'}</dd></div>
        {#if match.stage === 'Tournament'}
          {#if match.tournamentName}
            <div><dt class="muted" style="font-size: 0.85rem;">Tournament</dt><dd>{match.tournamentName}</dd></div>
          {/if}
          {#if match.round != null}
            <div><dt class="muted" style="font-size: 0.85rem;">Round</dt><dd>{match.round}</dd></div>
          {/if}
        {/if}
        {#if match.games?.length}
          <div>
            <dt class="muted" style="font-size: 0.85rem;">Games</dt>
            <dd>
              {#each match.games as g, i}
                <span>Game {i + 1}: {g.p1Score}–{g.p2Score}</span>{#if i < match.games.length - 1}, {/if}
              {/each}
            </dd>
          </div>
        {/if}
        {#if match.notes}
          <div><dt class="muted" style="font-size: 0.85rem;">Notes</dt><dd>{match.notes}</dd></div>
        {/if}
      </dl>

      {#if error}
        <p class="alert">{error}</p>
      {/if}

      <div class="row" style="margin-top: 16px; gap: 12px; flex-wrap: wrap;">
        <a href="/matches" class="btn">Back</a>
        <button type="button" class="btn btn--danger" onclick={onDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  {/if}
</div>
