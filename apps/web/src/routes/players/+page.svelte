<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';

  let players = $state<Array<{ _id: string; name: string; team: string }>>([]);
  let loading = $state(true);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/players`);
      if (!res.ok) {
        error = 'Failed to load players';
        return;
      }
      players = await res.json();
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
  {:else if players.length === 0}
    <div class="card stack">
      <h2 class="card__title">No players yet</h2>
      <p class="card__sub">Create your first player – name and team.</p>
      <a href="/players/new" class="btn btn--primary" style="align-self: flex-start; margin-top: 8px;">
        New player
      </a>
    </div>
  {:else}
    <div class="row" style="justify-content: space-between; margin-bottom: 16px;">
      <h2 class="card__title" style="margin: 0;">Players</h2>
      <a href="/players/new" class="btn btn--primary">New player</a>
    </div>
    <div class="stack">
      {#each players as player}
        <div class="playercard">
          <div class="playercard__name">{player.name}</div>
          {#if player.team}
            <div class="playercard__meta">{player.team}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
