<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconTeam from '$lib/icons/IconTeam.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconInfo from '$lib/icons/IconInfo.svelte';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconPenalties from '$lib/icons/IconPenalties.svelte';
  import { authMe } from '$lib/me';
  import { locale, setLocale, t } from '$lib/i18n';
  import type { Locale } from '$lib/i18n';
  import { TEAM_TAB_IDS, teamTabFromSearchParams } from '$lib/teamTabs';

  interface Props {
    authDisplayName: string;
    logout: () => Promise<void>;
  }
  let { authDisplayName = '', logout }: Props = $props();

  let statsMenuOpen = $state(false);
  let statsDropdownEl: HTMLDivElement | null = $state(null);
  let userMenuOpen = $state(false);
  let userDropdownEl: HTMLDivElement | null = $state(null);
  let infoMenuOpen = $state(false);
  let infoDropdownEl: HTMLDivElement | null = $state(null);
  let teamMenuOpen = $state(false);
  let teamDropdownEl: HTMLDivElement | null = $state(null);

  const playerName = $derived(($authMe?.player?.name ?? '').trim());

  function pickLocale(next: Locale) {
    setLocale(next);
  }

  const TEAM_TAB_ICON_MAP = {
    members: IconUsers,
    ranking: IconTrophy,
    penalties: IconPenalties,
    court: IconGavel,
    finance: IconBarChart,
  };

  const activeTeamTab = $derived(
    $page.url.pathname.startsWith('/team')
      ? teamTabFromSearchParams($page.url.searchParams)
      : null,
  );

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') && $page.url.pathname !== '/matches/new'
  );
  const isTournaments = $derived($page.url.pathname.startsWith('/tournaments'));
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isTeam = $derived($page.url.pathname.startsWith('/team'));
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
  const isStats = $derived($page.url.pathname === '/stats');
  const isMe = $derived($page.url.pathname === '/me');
  const isMyStatistics = $derived($page.url.pathname === '/me/statistics');
  $effect(() => {
    $page.url.pathname;
    statsMenuOpen = false;
    userMenuOpen = false;
    infoMenuOpen = false;
    teamMenuOpen = false;
  });

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (statsMenuOpen) {
        const el = statsDropdownEl;
        if (!el || !el.contains(t)) statsMenuOpen = false;
      }
      if (userMenuOpen) {
        const el = userDropdownEl;
        if (!el || !el.contains(t)) userMenuOpen = false;
      }
      if (infoMenuOpen) {
        const el = infoDropdownEl;
        if (!el || !el.contains(t)) infoMenuOpen = false;
      }
      if (teamMenuOpen) {
        const el = teamDropdownEl;
        if (!el || !el.contains(t)) teamMenuOpen = false;
      }
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
    <span class="desktop-nav__link-label">{$t('nav.matches')}</span>
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
    <span class="desktop-nav__link-label">{$t('nav.tournaments')}</span>
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
        <span class="desktop-nav__link-label">{$t('nav.statistics')}</span>
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
        <span class="visually-hidden">{$t('nav.openStatisticsSubmenu')}</span>
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
      aria-label={$t('nav.statisticsSection')}
    >
      <a
        href="/me/statistics"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={isMyStatistics}
        aria-current={isMyStatistics ? 'page' : undefined}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <IconBarChart size={18} />
        </span>
        <span>{$t('nav.myStatistics')}</span>
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
    <span class="desktop-nav__link-label">{$t('nav.decks')}</span>
  </a>
  <div
  class="desktop-nav__dropdown"
  class:desktop-nav__dropdown--open={teamMenuOpen}
  bind:this={teamDropdownEl}
>
  <div class="desktop-nav__dropdown-inner">
    <a
      href="/team"
      class="desktop-nav__link desktop-nav__link--dropdown-main"
      class:desktop-nav__link--active={isTeam}
    >
      <span class="desktop-nav__link-icon" aria-hidden="true">
        <IconTeam size={28} />
      </span>
      <span class="desktop-nav__link-label">{$t('nav.team')}</span>
    </a>
    <button
      type="button"
      class="desktop-nav__dropdown-toggle"
      aria-expanded={teamMenuOpen}
      aria-controls="desktop-nav-team-submenu"
      aria-haspopup="true"
      id="desktop-nav-team-menubutton"
      onclick={(e) => {
        e.stopPropagation();
        teamMenuOpen = !teamMenuOpen;
      }}
    >
      <span class="visually-hidden">{$t('nav.openTeamSubmenu')}</span>
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
    id="desktop-nav-team-submenu"
    class="desktop-nav__dropdown-panel"
    role="group"
    aria-label={$t('team.tablistLabel')}
  >
    {#each TEAM_TAB_IDS as tabId (tabId)}
      {@const TabIcon = TEAM_TAB_ICON_MAP[tabId]}
      <a
        href="/team?tab={tabId}"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={activeTeamTab === tabId}
        aria-current={activeTeamTab === tabId ? 'page' : undefined}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <TabIcon size={18} />
        </span>
        <span>{$t(`team.tabs.${tabId}`)}</span>
      </a>
    {/each}
  </div>
</div>

<div
    class="desktop-nav__dropdown desktop-nav__info"
    class:desktop-nav__dropdown--open={infoMenuOpen}
    bind:this={infoDropdownEl}
  >
    <div class="desktop-nav__dropdown-inner desktop-nav__dropdown-inner--info">
      <button
        type="button"
        class="desktop-nav__link desktop-nav__link--dropdown-main"
        class:desktop-nav__link--active={isPlayers}
        aria-controls="desktop-nav-info-submenu"
        aria-haspopup="true"
        id="desktop-nav-info-mainbutton"
        aria-label={$t('nav.moreInformation')}
        onclick={(e) => {
          e.stopPropagation();
          infoMenuOpen = !infoMenuOpen;
        }}
      >
        <span class="desktop-nav__link-icon" aria-hidden="true">
          <IconInfo size={28} />
        </span>
      </button>
      <button
        type="button"
        class="desktop-nav__dropdown-toggle"
        aria-expanded={infoMenuOpen}
        aria-controls="desktop-nav-info-submenu"
        aria-haspopup="true"
        id="desktop-nav-info-menubutton"
        onclick={(e) => {
          e.stopPropagation();
          infoMenuOpen = !infoMenuOpen;
        }}
      >
        <span class="visually-hidden">{$t('nav.openMoreInformationMenu')}</span>
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
      id="desktop-nav-info-submenu"
      class="desktop-nav__dropdown-panel"
      role="group"
      aria-label={$t('nav.moreInformation')}
    >
      <a
        href="/players"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={isPlayers}
        aria-current={isPlayers ? 'page' : undefined}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <IconUsers size={18} />
        </span>
        <span>{$t('nav.players')}</span>
      </a>
    </div>
  </div>

  <div
    class="desktop-nav__dropdown desktop-nav__account"
    class:desktop-nav__dropdown--open={userMenuOpen}
    bind:this={userDropdownEl}
  >
    <div class="desktop-nav__dropdown-inner desktop-nav__dropdown-inner--account">
      <a
        href="/me"
        class="desktop-nav__link desktop-nav__link--dropdown-main"
        class:desktop-nav__link--active={isMe}
        aria-current={isMe ? 'page' : undefined}
        title={[playerName, authDisplayName].filter(Boolean).join(' · ') || undefined}
        aria-label={playerName
          ? authDisplayName
            ? `Profile: ${playerName} (${authDisplayName})`
            : `Profile: ${playerName}`
          : authDisplayName
            ? `Profile: ${authDisplayName}`
            : $t('common.profile')}
      >
        <span class="desktop-nav__link-icon" aria-hidden="true">
          <IconUser size={28} />
        </span>
      </a>
      <button
        type="button"
        class="desktop-nav__dropdown-toggle"
        aria-expanded={userMenuOpen}
        aria-controls="desktop-nav-user-submenu"
        aria-haspopup="true"
        id="desktop-nav-user-menubutton"
        onclick={(e) => {
          e.stopPropagation();
          userMenuOpen = !userMenuOpen;
        }}
      >
        <span class="visually-hidden">{$t('nav.openAccountMenu')}</span>
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
      id="desktop-nav-user-submenu"
      class="desktop-nav__dropdown-panel"
      role="group"
      aria-label={$t('nav.accountMenu')}
    >
      {#if playerName}
        <div class="desktop-nav__account-player muted" role="presentation">{playerName}</div>
      {/if}
      <div class="desktop-nav__lang" role="group" aria-label={$t('common.language')}>
        <button
          type="button"
          class="desktop-nav__lang-btn"
          class:desktop-nav__lang-btn--active={$locale === 'de'}
          onclick={() => pickLocale('de')}
        >
          {$t('lang.deShort')}
        </button>
        <button
          type="button"
          class="desktop-nav__lang-btn"
          class:desktop-nav__lang-btn--active={$locale === 'en'}
          onclick={() => pickLocale('en')}
        >
          {$t('lang.enShort')}
        </button>
      </div>
      <a
        href="/me/statistics"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={isMyStatistics}
        aria-current={isMyStatistics ? 'page' : undefined}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <IconBarChart size={18} />
        </span>
        <span>{$t('nav.myStatistics')}</span>
      </a>
      <a
        href="/decks"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <IconDecks size={18} />
        </span>
        <span>{$t('nav.myDecks')}</span>
      </a>
      <button
        type="button"
        class="desktop-nav__dropdown-link"
        onclick={() => {
          userMenuOpen = false;
          void logout();
        }}
      >
        <span class="desktop-nav__dropdown-link-icon" aria-hidden="true">
          <IconLogOut size={18} />
        </span>
        <span>{$t('nav.logOut')}</span>
      </button>
    </div>
  </div>
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

  .desktop-nav__info {
    margin-left: auto;
  }

  .desktop-nav__info :global(.desktop-nav__dropdown-panel) {
    left: auto;
    right: 0;
  }

  .desktop-nav__account :global(.desktop-nav__dropdown-panel) {
    left: auto;
    right: 0;
  }

  .desktop-nav__dropdown-inner {
    display: flex;
    align-items: stretch;
    min-width: 0;
  }

  :global(.desktop-nav__dropdown-inner--account .desktop-nav__link.desktop-nav__link--dropdown-main) {
    flex: 0 0 auto;
  }

  :global(.desktop-nav__dropdown-inner--info .desktop-nav__link.desktop-nav__link--dropdown-main) {
    flex: 0 0 auto;
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
    width: 22px;
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

  .desktop-nav__account-player {
    padding: 8px 12px 10px;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25;
    border-bottom: 1px solid var(--glass-border);
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desktop-nav__lang {
    display: flex;
    gap: 6px;
    justify-content: center;
    padding: 8px 10px 10px;
    border-bottom: 1px solid var(--glass-border);
  }

  .desktop-nav__lang-btn {
    min-width: 2.5rem;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      color var(--transition),
      background var(--transition),
      border-color var(--transition);
  }

  .desktop-nav__lang-btn:hover {
    color: var(--fg);
    background: var(--glass-bg-strong);
  }

  .desktop-nav__lang-btn--active {
    color: var(--primary);
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, transparent);
  }
</style>
