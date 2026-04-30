<script lang="ts">
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
  const isStatsSection = $derived(isStats || isMyStatistics);
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
  <div class="desktop-nav__dropdown">
    <a
      href="/stats"
      class="desktop-nav__link"
      class:desktop-nav__link--active={isStatsSection}
      aria-current={isStats && !isMyStatistics ? 'page' : undefined}
    >
      <span class="desktop-nav__link-icon" aria-hidden="true">
        <IconBarChart size={28} />
      </span>
      <span class="desktop-nav__link-label">Statistics</span>
    </a>
    <div class="desktop-nav__dropdown-panel" role="group" aria-label="Statistics submenu">
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
