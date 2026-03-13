<script lang="ts">
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import DeckStatsContent from './stats/DeckStatsContent.svelte';

  let { deckId }: { deckId: string } = $props();

  const apiUrl = config.apiUrl ?? '/api';

  let stats = $state<import('./stats/DeckStatsContent.svelte').DeckStats | null>(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await fetch(`${apiUrl}/decks/${deckId}/stats`);
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

<div class="deck-view-statistics" role="tabpanel" aria-label="Deck statistics">
  <DeckStatsContent stats={stats} loading={loading} error={error} />
</div>
