<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';

  interface Props {
    authDisplayName: string;
    logout: () => Promise<void>;
  }
  let { authDisplayName = '', logout }: Props = $props();

  let statsMenuOpen = $state(false);
  let statsDropdownEl: HTMLDivElement | null = $state(null);

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') && $page.url.pathname !== '/matches/new'
  );
  const isTournaments = $derived($page.url.pathname.startsWith('/tournaments'));
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
  const isStats = $derived($page.url.pathname === '/stats');
  const isMe = $derived($page.url.pathname === '/me');
  const isMyStatistics = $derived($page.url.pathname === '/me/statistics');
  $effect(() => {
    $page.url.pathname;
    statsMenuOpen = false;
  });

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!statsMenuOpen) return;
      const el = statsDropdownEl;
      const t = e.target;
      if (el && t instanceof Node && el.contains(t)) return;
      statsMenuOpen = false;
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  });
</script>

<nav class="desktop-nav" aria-label="Primary">
  <a
    href="/"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isHome}
    aria-current={isHome ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <img class="desktop-nav__brand-logo" src={logo} alt="" width="64" height="64" />
    </span>
  </a>
  <a
    href="/matches"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isMatches}
    aria-current={isMatches ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconTrophy size={28} />
    </span>
    <span class="desktop-nav__link-label">Matches</span>
  </a>
  <a
    href="/tournaments"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isTournaments}
    aria-current={isTournaments ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconCrownOutline size={28} />
    </span>
    <span class="desktop-nav__link-label">Tournaments</span>
  </a>
  <div
    class="desktop-nav__dropdown"
    class:desktop-nav__dropdown--open={statsMenuOpen}
    bind:this={statsDropdownEl}
  >
    <div class="desktop-nav__dropdown-inner">
      <a
        href="/stats"
        class="desktop-nav__link desktop-nav__link--dropdown-main"
        class:desktop-nav__link--active={isStats && !isMyStatistics}
        aria-current={isStats && !isMyStatistics ? 'page' : undefined}
      >
        <span class="desktop-nav__link-icon" aria-hidden="true">
          <IconBarChart size={28} />
        </span>
        <span class="desktop-nav__link-label">Statistics</span>
      </a>
      <button
        type="button"
        class="desktop-nav__dropdown-toggle"
        aria-expanded={statsMenuOpen}
        aria-controls="desktop-nav-stats-submenu"
        aria-haspopup="true"
        id="desktop-nav-stats-menubutton"
        onclick={(e) => {
          e.stopPropagation();
          statsMenuOpen = !statsMenuOpen;
        }}
      >
        <span class="visually-hidden">Open Statistics submenu</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <div
      id="desktop-nav-stats-submenu"
      class="desktop-nav__dropdown-panel"
      role="group"
      aria-label="Statistics submenu"
    >
      <a
        href="/me/statistics"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={isMyStatistics}
        aria-current={isMyStatistics ? 'page' : undefined}
      >
        My statistics
      </a>
    </div>
  </div>
  <a
    href="/decks"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isDecks}
    aria-current={isDecks ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconDecks size={28} />
    </span>
    <span class="desktop-nav__link-label">Decks</span>
  </a>
  <a
    href="/players"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isPlayers}
    aria-current={isPlayers ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconUsers size={28} />
    </span>
    <span class="desktop-nav__link-label">Players</span>
  </a>
  <a
    href="/me"
    class="desktop-nav__link"
    class:desktop-nav__link--active={isMe}
    aria-current={isMe ? 'page' : undefined}
    title={authDisplayName}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconUser size={28} />
    </span>
    <span class="desktop-nav__link-label">Me</span>
  </a>
  <button type="button" class="desktop-nav__link" onclick={logout} title="Logout">
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconLogOut size={28} />
    </span>
    <span class="desktop-nav__link-label">Logout</span>
  </button>
</nav>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .desktop-nav__dropdown-inner {
    display: flex;
    align-items: stretch;
    min-width: 0;
  }

  :global(.desktop-nav__link.desktop-nav__link--dropdown-main) {
    flex: 1;
    min-width: 0;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .desktop-nav__dropdown-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    flex-shrink: 0;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      color var(--transition),
      background var(--transition);
    -webkit-tap-highlight-color: transparent;
  }

  .desktop-nav__dropdown-toggle:hover {
    color: var(--fg);
    background: var(--glass-bg-strong);
  }

  :global(.desktop-nav__dropdown--open) .desktop-nav__dropdown-toggle {
    color: var(--fg);
    background: var(--glass-bg-strong);
  }
</style>
