<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import logo from '../images/logo.svg';

  const title = $derived(
    (() => {
      const p = $page.url.pathname;
      if (p === '/players/new') return 'New player';
      if (p.startsWith('/players')) return 'Players';
      if (p === '/matches/stats') return 'Match statistics';
      if (p === '/matches/new') return 'New match';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })(),
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived($page.url.pathname.startsWith('/matches'));
  const isPlayers = $derived($page.url.pathname === '/players');
  const isNewMatch = $derived($page.url.pathname === '/matches/new');
</script>

<svelte:head>
  <title>{title} · Big Ink Lab</title>
</svelte:head>

{#if !isLorePage}
<header class="topbar">
  <a href="/" class="topbar__brand" aria-label="Big Ink Lab – Home">
    <img src={logo} alt="" width="44" height="44" />
  </a>
  <span class="topbar__title">{title}</span>
</header>
{/if}

<div class="app">
  <main id="main" class="main" class:main--full={isLorePage} tabindex="-1">
    <slot />
  </main>

  {#if !isLorePage}
  <nav class="bottomnav" aria-label="Primary">
    <a href="/" class="navitem" class:navitem--active={isHome} aria-current={isHome ? 'page' : undefined}>
      <span class="navitem__label">Home</span>
    </a>
    <a href="/matches" class="navitem" class:navitem--active={isMatches} aria-current={isMatches && !isNewMatch ? 'page' : undefined}>
      <span class="navitem__label">Matches</span>
    </a>
    <a href="/players" class="navitem" class:navitem--active={isPlayers} aria-current={isPlayers ? 'page' : undefined}>
      <span class="navitem__label">Players</span>
    </a>
    <a href="/matches/new" class="navitem" class:navitem--active={isNewMatch} aria-current={isNewMatch ? 'page' : undefined}>
      <span class="navitem__label">New match</span>
    </a>
  </nav>
  {/if}
</div>
