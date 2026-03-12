<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { config } from '$lib/config';
  import { clearAuthSession, getAuthToken, getAuthUser } from '$lib/auth';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import DesktopNavBar from '$lib/DesktopNavBar.svelte';
  import MobileNavBar from '$lib/MobileNavBar.svelte';
  import MobileNavDrawer from '$lib/MobileNavDrawer.svelte';

  let { children = undefined }: { children?: Snippet } = $props();

  let mobileMenuOpen = $state(false);

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

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
      if (p === '/me/statistics') return 'My statistics';
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

</script>

<svelte:head>
  <title>{title} · Big Ink Lab</title>
</svelte:head>

{#if !isLorePage && !isAuthPage && authReady && isAuthenticated}
  <header class="topbar">
    <div class="topbar__desktop-only">
      <DesktopNavBar authDisplayName={authDisplayName} logout={logout} />
    </div>
    <div class="topbar__mobile-only">
      <MobileNavBar
        menuOpen={mobileMenuOpen}
        onMoreClick={() => (mobileMenuOpen = !mobileMenuOpen)}
      />
    </div>
  </header>
  <!-- Drawer outside topbar so it covers full viewport (fixed positioning not constrained by topbar) -->
  <MobileNavDrawer
    open={mobileMenuOpen}
    closeMenu={closeMobileMenu}
    logout={logout}
  />
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
