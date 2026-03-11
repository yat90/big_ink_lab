<script lang="ts">
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';

  interface Props {
    open: boolean;
    closeMenu: () => void;
    logout: () => Promise<void>;
  }
  let { open = false, closeMenu, logout }: Props = $props();

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') &&
      $page.url.pathname !== '/matches/new' &&
      $page.url.pathname !== '/matches/quick'
  );
  const isQuickMatch = $derived($page.url.pathname === '/matches/quick');
  const isStats = $derived($page.url.pathname === '/stats');
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isMe = $derived($page.url.pathname === '/me');

  $effect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

{#if open}
  <div class="mobile-nav__backdrop" role="presentation" onclick={closeMenu}></div>
  <nav id="mobile-nav-drawer" class="mobile-nav__drawer" aria-label="More menu">
    <button
      type="button"
      class="mobile-nav__drawer-close"
      aria-label="Close menu"
      onclick={closeMenu}
    >
      <IconClose size={24} />
    </button>
    <div class="mobile-nav__drawer-header">
      <img class="mobile-nav__drawer-header-logo" src={logo} alt="" width="128" height="128" />
    </div>
    <a
      href="/"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isHome}
      aria-current={isHome ? 'page' : undefined}
      onclick={closeMenu}
    >
      Dashboard
    </a>
    <a
      href="/matches"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isMatches}
      aria-current={isMatches ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconTrophy size={24} />
      </span>
      Matches
    </a>
    <a
      href="/matches/quick"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isQuickMatch}
      aria-current={isQuickMatch ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconPlay size={24} />
      </span>
      Quick Match
    </a>
    <a
      href="/decks"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isDecks}
      aria-current={isDecks ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconDecks size={24} />
      </span>
      Decks
    </a>
    <a
      href="/stats"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isStats}
      aria-current={isStats ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconBarChart size={24} />
      </span>
      Statistics
    </a>
    <a
      href="/players"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isPlayers}
      aria-current={isPlayers ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconUsers size={24} />
      </span>
      Players
    </a>
    <div class="mobile-nav__drawer-divider" role="separator" aria-hidden="true"></div>
    <a
      href="/me"
      class="mobile-nav__drawer-link mobile-nav__drawer-link--bottom"
      class:mobile-nav__drawer-link--active={isMe}
      aria-current={isMe ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconUser size={24} />
      </span>
      Me
    </a>
    <button
      type="button"
      class="mobile-nav__drawer-link mobile-nav__drawer-link--button mobile-nav__drawer-link--bottom"
      onclick={() => (closeMenu(), logout())}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconLogOut size={24} />
      </span>
      Logout
    </button>
    <div class="mobile-nav__drawer-divider" role="separator" aria-hidden="true"></div>
    <button
      type="button"
      class="mobile-nav__drawer-link mobile-nav__drawer-link--button mobile-nav__drawer-link--close"
      aria-label="Close menu"
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconClose size={24} />
      </span>
      Close
    </button>
  </nav>
{/if}
