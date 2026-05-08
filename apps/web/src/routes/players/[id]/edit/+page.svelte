<script lang="ts">
  import AppBanner from '$lib/AppBanner.svelte';
  import AppButton from '$lib/AppButton.svelte';
  import AppCard from '$lib/AppCard.svelte';
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const id = $page.params.id;
  let name = $state('');
  let team = $state('');
  let isGuest = $state(false);
  /** When true, cannot enable guest — someone logs in as this player. */
  let hasLinkedAccount = $state(false);
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
      isGuest = player.isGuest === true;
      hasLinkedAccount = player.hasLinkedAccount === true;
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
        body: JSON.stringify({
          name: name.trim(),
          team: team.trim(),
          isGuest: hasLinkedAccount ? false : isGuest,
        }),
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
    <AppCard>
      <div class="loading-skeleton" aria-busy="true" aria-live="polite">
        <div class="loading-skeleton__line loading-skeleton__line--title"></div>
        <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      </div>
      <p class="muted" style="margin-top: var(--space-md);">Loading…</p>
    </AppCard>
  {:else if error && !name && !team}
    <AppCard role="alert">
      <AppBanner variant="danger" message={error} />
      <AppButton href="/players">Back to players</AppButton>
    </AppCard>
  {:else}
    <AppCard className="stack">
      <h2 class="card__title">Edit player</h2>
      <p class="card__sub">Change name and team.</p>

      <form onsubmit={onSubmit} class="stack" style="margin-top: 8px;">
        {#if hasLinkedAccount}
          <p class="muted" role="status" style="margin: 0;">
            This player is linked to a login account — they stay on the roster as a regular profile.
          </p>
        {:else}
          <label
            class="label"
            style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;"
          >
            <input type="checkbox" bind:checked={isGuest} style="margin-top: 0.2rem;" />
            <span>
              <strong style="font-weight: 700;">Guest profile</strong>
              <span class="hint" style="display: block; margin-top: 0.25rem;">
                No one can sign in as this player until you link an account. Guest profiles are
                hidden from the default list; use Players → Guests or All to find them.
              </span>
            </span>
          </label>
        {/if}

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
          <AppBanner variant="danger" message={error} />
        {/if}

        <div class="row" style="margin-top: 8px; gap: 12px;">
          <AppButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </AppButton>
          <AppButton href="/players/{id}">Cancel</AppButton>
        </div>
      </form>
    </AppCard>
  {/if}
</div>
