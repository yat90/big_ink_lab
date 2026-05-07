<script lang="ts">
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';

  let name = $state('');
  let team = $state('');
  /** Guest profiles have no login; hidden from default roster list. */
  let isGuest = $state(false);
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
        body: JSON.stringify({
          name: name.trim(),
          team: team.trim(),
          isGuest: isGuest,
        }),
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
      <label
        class="label"
        style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;"
      >
        <input type="checkbox" bind:checked={isGuest} style="margin-top: 0.2rem;" />
        <span>
          <strong style="font-weight: 700;">Guest profile</strong>
          <span class="hint" style="display: block; margin-top: 0.25rem;">
            Use for people without a login. Guest players are hidden from the default roster list;
            use the Players filters to see them.
          </span>
        </span>
      </label>

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
        <button type="submit" class="btn btn--primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create player'}
        </button>
        <a href="/players" class="btn">Cancel</a>
      </div>
    </form>
  </div>
</div>
