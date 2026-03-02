<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import logo from '../images/logo.svg';

  const title = $derived(
    (() => {
      const p = $page.url.pathname;
      if (p === '/players/new') return 'New player';
      if (p.startsWith('/players')) return 'Players';
      if (p === '/stats') return 'Statistics';
      if (p === '/matches/new') return 'New match';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })(),
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived($page.url.pathname.startsWith('/matches') && $page.url.pathname !== '/matches/new');
  const isPlayers = $derived($page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/'));
  const isStats = $derived($page.url.pathname === '/stats');

  let menuOpen = $state(false);

  function closeMenu() {
    menuOpen = false;
  }

  $effect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<svelte:head>
  <title>{title} · Big Ink Lab</title>
</svelte:head>

{#if !isLorePage}
<header class="topbar">
  <a href="/" class="topbar__brand" aria-label="Big Ink Lab – Home">
    <img src={logo} alt="" width="44" height="44" />
    <span class="topbar__sitename">Big Ink Lab</span>
  </a>
  <nav class="topbar__nav" aria-label="Primary">
    <a href="/" class="topbar__link" class:topbar__link--active={isHome} aria-current={isHome ? 'page' : undefined}>Home</a>
    <a href="/matches" class="topbar__link" class:topbar__link--active={isMatches} aria-current={isMatches ? 'page' : undefined}>Matches</a>
    <a href="/players" class="topbar__link" class:topbar__link--active={isPlayers} aria-current={isPlayers ? 'page' : undefined}>Players</a>
    <a href="/stats" class="topbar__link" class:topbar__link--active={isStats} aria-current={isStats ? 'page' : undefined}>Statistics</a>
  </nav>
  <button
    type="button"
    class="topbar__burger"
    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={menuOpen}
    aria-controls="nav-drawer"
    onclick={() => (menuOpen = !menuOpen)}
  >
    <span class="topbar__burger-line"></span>
    <span class="topbar__burger-line"></span>
    <span class="topbar__burger-line"></span>
  </button>
</header>

{#if menuOpen}
  <div class="topbar__backdrop" role="presentation" onclick={closeMenu}></div>
  <nav id="nav-drawer" class="topbar__drawer" aria-label="Primary">
    <a href="/" class="topbar__drawer-link" class:topbar__drawer-link--active={isHome} aria-current={isHome ? 'page' : undefined} onclick={closeMenu}>Home</a>
    <a href="/matches" class="topbar__drawer-link" class:topbar__drawer-link--active={isMatches} aria-current={isMatches ? 'page' : undefined} onclick={closeMenu}>Matches</a>
    <a href="/players" class="topbar__drawer-link" class:topbar__drawer-link--active={isPlayers} aria-current={isPlayers ? 'page' : undefined} onclick={closeMenu}>Players</a>
    <a href="/stats" class="topbar__drawer-link" class:topbar__drawer-link--active={isStats} aria-current={isStats ? 'page' : undefined} onclick={closeMenu}>Statistics</a>
  </nav>
{/if}
{/if}

<div class="app">
  <main id="main" class="main" class:main--full={isLorePage} tabindex="-1">
    <slot />
  </main>
</div>
