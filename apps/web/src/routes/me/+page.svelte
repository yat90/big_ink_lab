<script lang="ts">
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';

  type MeUser = { id: string; email: string; name?: string };
  type MePlayer = { _id: string; name: string; team: string };

  let user = $state<MeUser | null>(null);
  let player = $state<MePlayer | null>(null);
  let teamName = $state('');
  let loading = $state(true);
  let savingTeam = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';
  const token = $derived(getAuthToken());

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
  {#if player}
    <div class="me-stats-cta">
      <a href="/me/statistics" class="me-stats-cta__link">
        View all my statistics
      </a>
      <p class="me-stats-cta__hint muted">
        Win rates, matchups, play style, and recent results in one place.
      </p>
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

  .me-stats-cta {
    margin-top: var(--space-lg);
    padding: var(--space-lg);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.04));
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .me-stats-cta__link {
    display: inline-block;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text);
    text-decoration: none;
    margin-bottom: var(--space-xs);
  }

  .me-stats-cta__link:hover {
    text-decoration: underline;
  }

  .me-stats-cta__hint {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style>
