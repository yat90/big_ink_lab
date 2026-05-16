<script lang="ts">
  import { config } from '$lib/config';
  import type { LorcanaMatch } from '$lib/lorcana-match';
  import MatchLineRow from '$lib/components/match/MatchLineRow.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import StatusStateCard from '$lib/components/ui/StatusStateCard.svelte';
  import { getLocale, translate, t } from '$lib/i18n';

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
        error = translate(getLocale(), 'decks.matchesTab.loadError');
        return;
      }
      const data = await res.json();
      matches = data.data ?? [];
      total = data.total ?? 0;
      currentPage = page;
    } catch {
      error = translate(getLocale(), 'decks.matchesTab.loadError');
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
    <StatusStateCard kind="loading" message={$t('decks.matchesTab.loading')} />
  {:else if error}
    <StatusStateCard kind="error" message={error} />
  {:else if matches.length === 0}
    <StatusStateCard kind="empty" message={$t('decks.matchesTab.empty')} />
  {:else}
    <ul class="match-line-row__list">
      {#each matches as match (match._id)}
        <MatchLineRow {match} perspective={{ matchupMode: 'opponent-only', deckId }} />
      {/each}
    </ul>
    {#if totalPages > 1}
      <div class="deck-view-matches__pagination">
        <Pagination {currentPage} {totalPages} onPageChange={(p) => loadMatches(p)} />
      </div>
    {/if}
  {/if}
</div>

<style>
  .deck-view-matches__pagination {
    margin-top: var(--space-lg);
  }
</style>
