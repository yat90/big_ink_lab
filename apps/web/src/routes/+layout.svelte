<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import logo from '../images/logo.svg';
  import { injectAnalytics } from '@vercel/analytics/sveltekit'

  injectAnalytics();

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
    <a href="/" class="topbar__link" class:topbar__link--active={isHome} aria-current={isHome ? 'page' : undefined}>
      <span class="topbar__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
      <span class="topbar__link-label">Home</span>
    </a>
    <a href="/matches" class="topbar__link" class:topbar__link--active={isMatches} aria-current={isMatches ? 'page' : undefined}>
      <span class="topbar__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span>
      <span class="topbar__link-label">Matches</span>
    </a>
    <a href="/players" class="topbar__link" class:topbar__link--active={isPlayers} aria-current={isPlayers ? 'page' : undefined}>
      <span class="topbar__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
      <span class="topbar__link-label">Players</span>
    </a>
    <a href="/stats" class="topbar__link" class:topbar__link--active={isStats} aria-current={isStats ? 'page' : undefined}>
      <span class="topbar__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg></span>
      <span class="topbar__link-label">Statistics</span>
    </a>
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
