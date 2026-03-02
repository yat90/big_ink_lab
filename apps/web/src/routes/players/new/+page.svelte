<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';

  let name = $state('');
  let team = $state('');
  let loading = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch(`${apiUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), team: team.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? `Error ${res.status}`;
        loading = false;
        return;
      }
      await goto('/players');
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="page">
  <div class="card stack">
    <h2 class="card__title">Create player</h2>
    <p class="card__sub">Add a new player with name and team.</p>

    <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
      <div class="formgrid">
        <label class="label" for="name">
          Name
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
          Team
          <input
            id="team"
            type="text"
            class="input"
            bind:value={team}
            required
            placeholder="Team name"
          />
        </label>
      </div>

      {#if error}
        <p class="alert">{error}</p>
      {/if}

      <div class="row" style="margin-top: 8px; gap: 12px;">
        <button type="submit" class="btn btn--primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create player'}
        </button>
        <a href="/players" class="btn">Cancel</a>
      </div>
    </form>
  </div>
</div>
