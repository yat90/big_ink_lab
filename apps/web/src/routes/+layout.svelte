<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';

  injectAnalytics();

  // Keep screen awake when PWA is in use (e.g. lore page on mobile)
  $effect(() => {
    if (typeof document === 'undefined' || !('wakeLock' in navigator)) return;
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch {
        // Ignore (e.g. low battery, not supported in context)
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  });

  const title = $derived(
    (() => {
      const p = $page.url.pathname;
      if (p === '/players/new') return 'New player';
      if (p.startsWith('/players')) return 'Players';
      if (p === '/decks/new') return 'New deck';
      if (p.startsWith('/decks')) return 'Decks';
      if (p === '/stats') return 'Statistics';
      if (p === '/matches/new') return 'New match';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })()
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') && $page.url.pathname !== '/matches/new'
  );
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
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
 
    <nav class="topbar__nav" aria-label="Primary">
      <a
        href="/"
        class="topbar__link"
        class:topbar__link--active={isHome}
        aria-current={isHome ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true"> 
          <img class="topbar__brand-logo" src={logo} alt="" width="64" height="64" />
        </span>
      </a>
      <a
        href="/matches"
        class="topbar__link"
        class:topbar__link--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconTrophy size={28} />
        </span>
        <span class="topbar__link-label">Matches</span>
      </a>
      <a
        href="/players"
        class="topbar__link"
        class:topbar__link--active={isPlayers}
        aria-current={isPlayers ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconUsers size={28} />
        </span>
        <span class="topbar__link-label">Players</span>
      </a>
      <a
        href="/decks"
        class="topbar__link"
        class:topbar__link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconDecks size={28} />
        </span>
        <span class="topbar__link-label">Decks</span>
      </a>
      <a
        href="/stats"
        class="topbar__link"
        class:topbar__link--active={isStats}
        aria-current={isStats ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconBarChart size={28} />
        </span>
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
      <a
        href="/"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isHome}
        aria-current={isHome ? 'page' : undefined}
        onclick={closeMenu}>Home</a
      >
      <a
        href="/matches"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
        onclick={closeMenu}>Matches</a
      >
      <a
        href="/players"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isPlayers}
        aria-current={isPlayers ? 'page' : undefined}
        onclick={closeMenu}>Players</a
      >
      <a
        href="/decks"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
        onclick={closeMenu}>Decks</a
      >
      <a
        href="/stats"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isStats}
        aria-current={isStats ? 'page' : undefined}
        onclick={closeMenu}>Statistics</a
      >
    </nav>
  {/if}
{/if}

<div class="app">
  <main id="main" class="main" class:main--full={isLorePage} tabindex="-1">
    <slot />
  </main>
</div>
