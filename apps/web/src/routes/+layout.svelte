<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { clearAuthSession, getAuthToken, getAuthUser } from '$lib/auth';
  import logo from '../images/bigInkLab.png';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';

  let { children = undefined }: { children?: Snippet } = $props();

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
      if (p === '/me') return 'Me';
      if (p === '/players/new') return 'New player';
      if (p.startsWith('/players')) return 'Players';
      if (p === '/matches/quick') return 'Quick Match';
      if (p === '/decks/new') return 'New deck';
      if (p.startsWith('/decks')) return 'Decks';
      if (p === '/stats') return 'Statistics';
      if (p === '/matches/new') return 'New match';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })()
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));
  const isAuthPage = $derived($page.url.pathname === '/login');
  const apiUrl = config.apiUrl ?? '/api';

  let authReady = $state(false);
  let isAuthenticated = $state(false);
  let authDisplayName = $state('');

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') && $page.url.pathname !== '/matches/new'
  );
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isQuickMatch = $derived($page.url.pathname === '/matches/quick');
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
  const isStats = $derived($page.url.pathname === '/stats');
  const isMe = $derived($page.url.pathname === '/me');

  let menuOpen = $state(false);

  function closeMenu() {
    menuOpen = false;
  }

  function isApiRequest(url: string): boolean {
    if (apiUrl.startsWith('/')) {
      if (url.startsWith(apiUrl)) return true;
      if (browser) return url.startsWith(`${window.location.origin}${apiUrl}`);
      return false;
    }
    return url.startsWith(apiUrl);
  }

  async function logout() {
    clearAuthSession();
    isAuthenticated = false;
    authDisplayName = '';
    await goto('/login');
  }

  onMount(() => {
    if (!browser) return;

    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = (input, init) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const token = getAuthToken();
      if (!token || !isApiRequest(rawUrl)) return originalFetch(input, init);

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      if (input instanceof Request) {
        return originalFetch(new Request(input, { ...(init ?? {}), headers }));
      }
      return originalFetch(input, { ...(init ?? {}), headers });
    };
    window.fetch = patchedFetch;

    const verifySession = async () => {
      const token = getAuthToken();
      const next = `${window.location.pathname}${window.location.search}`;
      if (!token) {
        isAuthenticated = false;
        authDisplayName = '';
        if (window.location.pathname !== '/login') {
          await goto(`/login?next=${encodeURIComponent(next)}`, { replaceState: true });
          return;
        }
        authReady = true;
        return;
      }

      try {
        const res = await originalFetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        isAuthenticated = true;
        authDisplayName = data?.user?.name || data?.user?.email || getAuthUser()?.email || 'User';
        authReady = true;
        if (window.location.pathname === '/login') {
          await goto('/', { replaceState: true });
        }
      } catch {
        clearAuthSession();
        isAuthenticated = false;
        authDisplayName = '';
        if (window.location.pathname !== '/login') {
          await goto(`/login?next=${encodeURIComponent(next)}`, { replaceState: true });
          return;
        }
        authReady = true;
      }
    };

    void verifySession();
    return () => {
      window.fetch = originalFetch;
    };
  });

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

{#if !isLorePage && !isAuthPage && authReady && isAuthenticated}
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
      <a
        href="/decks"
        class="topbar__link"
        class:topbar__link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconDecks size={24} />
        </span>
        <span class="topbar__link-label">Decks</span>
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
        href="/me"
        class="topbar__link"
        class:topbar__link--active={isMe}
        aria-current={isMe ? 'page' : undefined}
        title={authDisplayName}
      >
        <span class="topbar__link-icon" aria-hidden="true">
          <IconUser size={28} />
        </span>
        <span class="topbar__link-label">Me</span>
      </a>
      <button type="button" class="topbar__link" onclick={logout} title="Logout">
        <span class="topbar__link-icon" aria-hidden="true">
          <IconLogOut size={28} />
        </span>
        <span class="topbar__link-label">Logout</span>
      </button>
      <button
        type="button"
        class="topbar__burger"
        aria-label={menuOpen ? 'Close menu' : 'More menu'}
        aria-expanded={menuOpen}
        aria-controls="nav-drawer"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <span class="topbar__burger-icon" aria-hidden="true">
          <span class="topbar__burger-line"></span>
          <span class="topbar__burger-line"></span>
          <span class="topbar__burger-line"></span>
        </span>
        <span class="topbar__burger-label">More</span>
      </button>
    </nav>
  </header>

  {#if menuOpen}
    <div class="topbar__backdrop" role="presentation" onclick={closeMenu}></div>
    <nav id="nav-drawer" class="topbar__drawer" aria-label="Primary">
      <button
        type="button"
        class="topbar__drawer-close"
        aria-label="Close menu"
        onclick={closeMenu}
      >
        <IconClose size={24} />
      </button>
      <a
        href="/"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isHome}
        aria-current={isHome ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <img class="topbar__drawer-logo" src={logo} alt="" width="24" height="24" />
        </span>
        Home
      </a>
      <a
        href="/matches"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconTrophy size={24} />
        </span>
        Matches
      </a>

      <a
        href="/matches/quick"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isQuickMatch}
        aria-current={isQuickMatch ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconPlay size={24} />
        </span>
        Quick Match
      </a>
      <a
        href="/decks"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconDecks size={24} />
        </span>
        Decks
      </a>
      <a
        href="/stats"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isStats}
        aria-current={isStats ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconBarChart size={24} />
        </span>
        Statistics
      </a>
      <a
        href="/players"
        class="topbar__drawer-link"
        class:topbar__drawer-link--active={isPlayers}
        aria-current={isPlayers ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconUsers size={24} />
        </span>
        Players
      </a>
      <div class="topbar__drawer-divider" role="separator" aria-hidden="true"></div>
      <a
        href="/me"
        class="topbar__drawer-link topbar__drawer-link--bottom"
        class:topbar__drawer-link--active={isMe}
        aria-current={isMe ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconUser size={24} />
        </span>
        Me
      </a>
      <button
        type="button"
        class="topbar__drawer-link topbar__drawer-link--button topbar__drawer-link--bottom"
        onclick={() => (closeMenu(), logout())}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconLogOut size={24} />
        </span>
        Logout
      </button>
      <div class="topbar__drawer-divider" role="separator" aria-hidden="true"></div>

      <button
        type="button"
        class="topbar__drawer-link topbar__drawer-link--button topbar__drawer-link--close"
        aria-label="Close menu"
        onclick={closeMenu}
      >
        <span class="topbar__drawer-link-icon" aria-hidden="true">
          <IconClose size={24} />
        </span>
        Close
      </button>
    </nav>
  {/if}
{/if}

<div class="app">
  <main id="main" class="main" class:main--full={isLorePage} tabindex="-1">
    {#if authReady || isAuthPage}
      {#if children}
        {@render children()}
      {/if}
    {:else}
      <div class="page">
        <div class="card">
          <p class="muted">Checking login…</p>
        </div>
      </div>
    {/if}
  </main>
</div>
