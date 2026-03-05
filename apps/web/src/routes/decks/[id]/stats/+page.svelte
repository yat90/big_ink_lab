<script lang="ts">
  import { page } from '$app/stores';

  const id = $page.params.id;
</script>

<div class="page">
  <div class="card stack">
    <h1 class="deck-stats__title">Deck statistics</h1>
    <p class="muted">
      Cost curve, color distribution, inkable breakdown, and card type stats will be shown here.
    </p>
    <a href="/decks/{id}" class="btn btn--primary">Back to deck</a>
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
