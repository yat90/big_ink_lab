<script lang="ts">
  import { config } from '$lib/config';
  import type { LorcanaMatch } from '$lib/lorcana-match';
  import MatchLineRow from '$lib/MatchLineRow.svelte';
  import Pagination from '$lib/Pagination.svelte';

  let { deckId }: { deckId: string } = $props();

  const apiUrl = config.apiUrl ?? '/api';
  const PAGE_SIZE = 10;

  let matches = $state<LorcanaMatch[]>([]);
  let total = $state(0);
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state('');

  const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

  async function loadMatches(page: number) {
    if (!deckId) return;
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      params.set('deck', deckId);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('sort', 'newest');
      const res = await fetch(`${apiUrl}/matches?${params}`);
      if (!res.ok) {
        error = 'Could not load matches.';
        return;
      }
      const data = await res.json();
      matches = data.data ?? [];
      total = data.total ?? 0;
      currentPage = page;
    } catch {
      error = 'Could not load matches.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (deckId) loadMatches(1);
  });
</script>

<div class="deck-view-matches" role="tabpanel" aria-label="Matches with this deck">
  {#if loading && matches.length === 0}
    <p class="muted">Loading matches…</p>
  {:else if error}
    <p class="deck-view-matches__error">{error}</p>
  {:else if matches.length === 0}
    <p class="muted">No matches recorded with this deck yet.</p>
  {:else}
    <ul class="match-line-row__list">
      {#each matches as match (match._id)}
        <MatchLineRow
          {match}
          perspective={{ matchupMode: 'opponent-only', deckId }}
        />
      {/each}
    </ul>
    {#if totalPages > 1}
      <div class="deck-view-matches__pagination">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => loadMatches(p)}
        />
      </div>
    {/if}
  {/if}
</div>

<style>
  .deck-view-matches__error {
    color: var(--danger);
  }
  .deck-view-matches__pagination {
    margin-top: var(--space-lg);
  }
</style>
