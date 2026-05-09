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
  import InstallPrompt from '$lib/InstallPrompt.svelte';
  import { setAuthMe } from '$lib/me';
  import PullToRefreshIndicator from '$lib/PullToRefreshIndicator.svelte';
  import { pullToRefresh } from '$lib/pullToRefresh';
  import { initLocale } from '$lib/i18n';
  import AppBreadcrumb from '$lib/AppBreadcrumb.svelte';
  import AppToast from '$lib/AppToast.svelte';

  let { children = undefined }: { children?: Snippet } = $props();

  let mobileMenuOpen = $state(false);

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  injectAnalytics();

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
      if (p === '/tournaments') return 'Tournaments';
      if (p === '/tournaments/new') return 'New tournament';
      if (p === '/tournaments/results') return 'Tournament results';
      if (/^\/tournaments\/[a-f\d]{24}$/i.test(p)) return 'Tournament';
      if (p === '/team') return 'Team';
      if (p.startsWith('/matches')) return 'Matches';
      return 'Big Ink Lab';
    })()
  );

  const isLorePage = $derived(/^\/matches\/[^/]+\/lore$/.test($page.url.pathname));
  const isAuthPage = $derived($page.url.pathname === '/login');
  const pullToRefreshDisabled = $derived(isLorePage || mobileMenuOpen);
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
    setAuthMe(null);
    isAuthenticated = false;
    authDisplayName = '';
    await goto('/login');
  }

  onMount(() => {
    if (!browser) return;
    initLocale();

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
        setAuthMe(null);
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
        setAuthMe(data);
        isAuthenticated = true;
        authDisplayName = data?.user?.name || data?.user?.email || getAuthUser()?.email || 'User';
        authReady = true;
        if (window.location.pathname === '/login') {
          await goto('/', { replaceState: true });
        }
      } catch {
        clearAuthSession();
        setAuthMe(null);
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
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="topbar">
    <div class="topbar__desktop-only">
      <DesktopNavBar {authDisplayName} {logout} />
    </div>
    <div class="topbar__mobile-only">
      <MobileNavBar
        menuOpen={mobileMenuOpen}
        onMoreClick={() => (mobileMenuOpen = !mobileMenuOpen)}
      />
    </div>
  </header>
  <!-- Drawer outside topbar so it covers full viewport (fixed positioning not constrained by topbar) -->
  <MobileNavDrawer open={mobileMenuOpen} closeMenu={closeMobileMenu} {logout} />
{/if}

<div class="app">
  {#if authReady && isAuthenticated && !isAuthPage}
    <InstallPrompt />
  {/if}
  <PullToRefreshIndicator />
  <AppToast />
  <main
    id="main"
    class="main"
    class:main--full={isLorePage}
    tabindex="-1"
    aria-label={title === 'Big Ink Lab' ? 'Main content' : `Main content — ${title}`}
    use:pullToRefresh={{ disabled: pullToRefreshDisabled }}
  >
    {#if authReady || isAuthPage}
      {#if children}
        {#if !isLorePage}
          <div class="main__breadcrumb" class:main__breadcrumb--lore={isLorePage}>
            <AppBreadcrumb />
          </div>
        {/if}
        {@render children()}
      {/if}
    {:else}
      <div class="page">
        <div class="auth-check" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <span class="muted">Checking login…</span>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .main__breadcrumb {
    width: 100%;
    max-width: 920px;
    margin-left: auto;
    margin-right: auto;
  }

  .main__breadcrumb--lore {
    padding-left: calc(12px + env(safe-area-inset-left));
    padding-right: calc(12px + env(safe-area-inset-right));
    padding-top: calc(12px + env(safe-area-inset-top));
  }

  .auth-check {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-xl) var(--space-md);
    min-height: 40vh;
  }
</style>
