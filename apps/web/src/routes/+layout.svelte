<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import logo from '../images/logo.svg';

  const title = $derived(
    (() => {
      const p = $page.url.pathname;
      if (p === '/players/new') return 'New player';
      if (p.startsWith('/players')) return 'Players';
      if (p === '/matches/new') return 'New match';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })(),
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));
</script>

<div class="app">
  {#if !isLorePage}
  <header class="topbar">
    <a href="/" class="topbar__brand" aria-label="Big Ink Lab">
      <img src={logo} alt="" width="44" height="44" />
    </a>
    <span class="topbar__title">{title}</span>
  </header>
  {/if}

  <main class="main" class:main--full={isLorePage}>
    <slot />
  </main>

  {#if !isLorePage}
  <nav class="bottomnav">
    <a href="/" class="navitem" class:navitem--active={$page.url.pathname === '/'}>
      <span class="navitem__label">Home</span>
    </a>
    <a href="/matches" class="navitem" class:navitem--active={$page.url.pathname.startsWith('/matches')}>
      <span class="navitem__label">Matches</span>
    </a>
    <a href="/players" class="navitem" class:navitem--active={$page.url.pathname === '/players'}>
      <span class="navitem__label">Players</span>
    </a>
    <a href="/matches/new" class="navitem" class:navitem--active={$page.url.pathname === '/matches/new'}>
      <span class="navitem__label">New match</span>
    </a>
  </nav>
  {/if}
</div>
