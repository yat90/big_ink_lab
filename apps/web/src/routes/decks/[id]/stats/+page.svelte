<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import DeckStatsContent from './DeckStatsContent.svelte';

  const id = $page.params.id;
  const apiUrl = config.apiUrl ?? '/api';

  let stats = $state<import('./DeckStatsContent.svelte').DeckStats | null>(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/decks/${id}/stats`);
      if (!res.ok) {
        error = res.status === 404 ? 'Deck not found' : 'Could not load statistics';
        loading = false;
        return;
      }
      stats = await res.json();
    } catch {
      error = 'Could not load statistics.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="page">
  <div class="card stack">
    <h1 class="deck-stats__title">Deck statistics</h1>
    <DeckStatsContent stats={stats} loading={loading} error={error} showBackLink={true} deckId={id} />
  </div>
</div>

<style>
  .deck-stats__title {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    font-size: 1.5rem;
    font-weight: 800;
  }
</style>
