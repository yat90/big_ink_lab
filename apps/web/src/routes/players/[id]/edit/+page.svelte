<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const id = $page.params.id;
  let name = $state('');
  let team = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/players/${id}`);
      if (!res.ok) {
        error = 'Player not found';
        loading = false;
        return;
      }
      const player = await res.json();
      name = player.name ?? '';
      team = player.team ?? '';
    } catch {
      error = 'Could not load player.';
    } finally {
      loading = false;
    }
  });

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (!name.trim()) return;
    error = '';
    saving = true;
    try {
      const res = await fetch(`${apiUrl}/players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), team: team.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? `Error ${res.status}`;
        saving = false;
        return;
      }
      await goto(`/players/${id}`);
    } catch {
      error = 'Could not reach API.';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit {name || 'Player'} · Big Ink Lab</title>
</svelte:head>

<div class="page">
  {#if loading}
    <div class="card">
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading…</p>
    </div>
  {:else if error && !name && !team}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <a href="/players" class="btn">Back to players</a>
    </div>
  {:else}
    <div class="card stack">
      <h2 class="card__title">Edit player</h2>
      <p class="card__sub">Change name and team.</p>

      <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
        <div class="formgrid">
          <label class="label" for="name">
            Name <span aria-hidden="true">*</span>
            <input
              id="name"
              type="text"
              class="input"
              bind:value={name}
              required
              autocomplete="name"
              placeholder="Player name"
            />
          </label>
          <label class="label" for="team">
            Team <span class="hint">(optional)</span>
            <input
              id="team"
              type="text"
              class="input"
              bind:value={team}
              autocomplete="organization"
              placeholder="Team or group"
            />
          </label>
        </div>

        {#if error}
          <p class="alert" role="alert" aria-live="assertive">{error}</p>
        {/if}

        <div class="row" style="margin-top: 8px; gap: 12px;">
          <button type="submit" class="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <a href="/players/{id}" class="btn">Cancel</a>
        </div>
      </form>
    </div>
  {/if}
</div>
