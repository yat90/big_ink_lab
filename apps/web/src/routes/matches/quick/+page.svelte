<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';

  const apiUrl = config.apiUrl ?? '/api';
  const QUICK_MATCH_P1_ID = '69a8a02d97f97400baf9f7fc';
  const QUICK_MATCH_P2_ID = '69a8a03297f97400baf9f7ff';

  let error = $state('');
  let loading = $state(true);

  onMount(async () => {
    try {
      let p1Id = QUICK_MATCH_P1_ID;
      const token = getAuthToken();
      if (token) {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.player?._id) p1Id = me.player._id;
        }
      }
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'Casual',
          games: [{}],
          p1: p1Id,
          p2: QUICK_MATCH_P2_ID,
          playedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        error = 'Could not create match';
        loading = false;
        return;
      }
      const match = await res.json();
      goto(`/matches/${match._id}/lore`);
    } catch {
      error = 'Could not reach API.';
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Quick Match · Big Ink Lab</title>
</svelte:head>

<div class="page">
  <div class="card stack">
    {#if loading && !error}
      <p class="muted">Creating quick match…</p>
    {:else if error}
      <p class="alert" role="alert">{error}</p>
      <a href="/" class="btn btn--primary">Back to home</a>
    {/if}
  </div>
</div>
