<script lang="ts">
  import { config } from '$lib/config';

  let message = $state('');

  async function fetchFromApi() {
    try {
      const res = await fetch(`${config.apiUrl ?? '/api'}/hello`);
      const data = await res.json();
      message = data.message ?? JSON.stringify(data);
    } catch {
      message = 'API not reachable (start the API or set VITE_API_URL in .env)';
    }
  }
</script>

<div class="page">
  <div class="card stack">
    <h2 class="card__title">Big Ink Lab</h2>
    <p class="card__sub">SvelteKit + NestJS on Vercel</p>
    <div class="row" style="flex-wrap: wrap; gap: 12px;">
      <a href="/matches" class="btn btn--primary">Matches</a>
      <a href="/players" class="btn">Players</a>
      <a href="/matches/new" class="btn">New match</a>
      <button type="button" class="btn" onclick={fetchFromApi}>Call API</button>
    </div>
    {#if message}
      <p class="muted" style="margin-top: 12px;">{message}</p>
    {/if}
  </div>
</div>
