<script lang="ts">
  import { config } from '$lib/config';

  let message = $state('');

  async function fetchFromApi() {
    try {
      const res = await fetch(`${config.apiUrl}/hello`);
      const data = await res.json();
      message = data.message ?? JSON.stringify(data);
    } catch (e) {
      message = 'API not reachable (start the API or set VITE_API_URL in .env)';
    }
  }
</script>

<main>
  <h1>Big Ink Lab</h1>
  <p>SvelteKit + NestJS on Vercel</p>
  <button onclick={fetchFromApi}>Call API</button>
  {#if message}
    <p class="message">{message}</p>
  {/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  button {
    padding: 0.5rem 1rem;
    margin-top: 1rem;
    cursor: pointer;
  }
  .message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f0f0f0;
    border-radius: 0.5rem;
  }
</style>
