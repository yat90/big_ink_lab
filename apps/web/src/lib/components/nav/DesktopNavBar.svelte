<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import logo from '../../../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconTeam from '$lib/icons/IconTeam.svelte';
  import IconCircleUser from '$lib/icons/IconCircleUser.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconPenalties from '$lib/icons/IconPenalties.svelte';
  import IconCloud from '$lib/icons/IconCloud.svelte';
  import { authMe } from '$lib/me';
  import { locale, setLocale, t } from '$lib/i18n';
  import type { Locale } from '$lib/i18n';
  import { TEAM_TAB_IDS, teamTabFromSearchParams } from '$lib/components/team/teamTabs';
  import { PRIMARY_NAV, isPrimaryNavActive } from '$lib/navConfig';

  interface Props {
    authDisplayName: string;
    logout: () => Promise<void>;
  }
  let { authDisplayName = '', logout }: Props = $props();

  let statsMenuOpen = $state(false);
  let statsDropdownEl: HTMLDivElement | null = $state(null);
  let langMenuOpen = $state(false);
  let langDropdownEl: HTMLDivElement | null = $state(null);
  let userMenuOpen = $state(false);
  let userDropdownEl: HTMLDivElement | null = $state(null);
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
    links: IconCloud,
  };

  const activeTeamTab = $derived(
    $page.url.pathname.startsWith('/team') ? teamTabFromSearchParams($page.url.searchParams) : null
  );

  const isHome = $derived(isPrimaryNavActive('home', $page.url.pathname));
  const isMatches = $derived(isPrimaryNavActive('matches', $page.url.pathname));
  const isTournaments = $derived(isPrimaryNavActive('tournaments', $page.url.pathname));
  const isPlayers = $derived(isPrimaryNavActive('players', $page.url.pathname));
  const isTeam = $derived(isPrimaryNavActive('team', $page.url.pathname));
  const isDecks = $derived(isPrimaryNavActive('decks', $page.url.pathname));
  const isStats = $derived($page.url.pathname === '/stats');
  const isMe = $derived($page.url.pathname === '/me');
  const isMyStatistics = $derived($page.url.pathname === '/me/statistics');
  $effect(() => {
    $page.url.pathname;
    statsMenuOpen = false;
    langMenuOpen = false;
    userMenuOpen = false;
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
      if (langMenuOpen) {
        const el = langDropdownEl;
        if (!el || !el.contains(t)) langMenuOpen = false;
      }
      if (userMenuOpen) {
        const el = userDropdownEl;
        if (!el || !el.contains(t)) userMenuOpen = false;
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
    href={PRIMARY_NAV.home.href}
    class="desktop-nav__link"
    class:desktop-nav__link--active={isHome}
    aria-current={isHome ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <img class="desktop-nav__brand-logo" src={logo} alt="" width="64" height="64" />
    </span>
  </a>
  <a
    href={PRIMARY_NAV.matches.href}
    class="desktop-nav__link"
    class:desktop-nav__link--active={isMatches}
    aria-current={isMatches ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconTrophy size={28} />
    </span>
    <span class="desktop-nav__link-label">{$t(PRIMARY_NAV.matches.labelKey)}</span>
  </a>
  <a
    href={PRIMARY_NAV.tournaments.href}
    class="desktop-nav__link"
    class:desktop-nav__link--active={isTournaments}
    aria-current={isTournaments ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconCrownOutline size={28} />
    </span>
    <span class="desktop-nav__link-label">{$t(PRIMARY_NAV.tournaments.labelKey)}</span>
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
    href={PRIMARY_NAV.decks.href}
    class="desktop-nav__link"
    class:desktop-nav__link--active={isDecks}
    aria-current={isDecks ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconDecks size={28} />
    </span>
    <span class="desktop-nav__link-label">{$t(PRIMARY_NAV.decks.labelKey)}</span>
  </a>
  <div
    class="desktop-nav__dropdown desktop-nav__dropdown--team"
    class:desktop-nav__dropdown--open={teamMenuOpen}
    bind:this={teamDropdownEl}
  >
    <div class="desktop-nav__dropdown-inner">
      <a
        href={PRIMARY_NAV.team.href}
        class="desktop-nav__link desktop-nav__link--dropdown-main"
        class:desktop-nav__link--active={isTeam}
      >
        <span class="desktop-nav__link-icon" aria-hidden="true">
          <IconTeam size={28} />
        </span>
        <span class="desktop-nav__link-label">{$t(PRIMARY_NAV.team.labelKey)}</span>
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

  <a
    href={PRIMARY_NAV.players.href}
    class="desktop-nav__link desktop-nav__link--push-end"
    class:desktop-nav__link--active={isPlayers}
    aria-current={isPlayers ? 'page' : undefined}
  >
    <span class="desktop-nav__link-icon" aria-hidden="true">
      <IconCircleUser size={28} />
    </span>
    <span class="desktop-nav__link-label">{$t(PRIMARY_NAV.players.labelKey)}</span>
  </a>

  <div
    class="desktop-nav__dropdown desktop-nav__dropdown--lang"
    class:desktop-nav__dropdown--open={langMenuOpen}
    bind:this={langDropdownEl}
  >
    <div class="desktop-nav__dropdown-inner">
      <button
        type="button"
        class="desktop-nav__link desktop-nav__link--dropdown-main desktop-nav__lang-main"
        aria-expanded={langMenuOpen}
        aria-haspopup="true"
        aria-controls="desktop-nav-lang-submenu"
        id="desktop-nav-lang-mainbutton"
        onclick={(e) => {
          e.stopPropagation();
          langMenuOpen = !langMenuOpen;
        }}
      >
        <span class="desktop-nav__link-label">
          {$locale === 'de' ? $t('lang.deShort') : $t('lang.enShort')}
        </span>
      </button>
      <button
        type="button"
        class="desktop-nav__dropdown-toggle"
        aria-expanded={langMenuOpen}
        aria-controls="desktop-nav-lang-submenu"
        aria-haspopup="true"
        id="desktop-nav-lang-menubutton"
        onclick={(e) => {
          e.stopPropagation();
          langMenuOpen = !langMenuOpen;
        }}
      >
        <span class="visually-hidden">{$t('nav.openLanguageSubmenu')}</span>
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
      id="desktop-nav-lang-submenu"
      class="desktop-nav__dropdown-panel desktop-nav__dropdown-panel--lang"
      role="group"
      aria-labelledby="desktop-nav-lang-mainbutton"
    >
      <button
        type="button"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={$locale === 'de'}
        aria-pressed={$locale === 'de'}
        onclick={() => {
          pickLocale('de');
          langMenuOpen = false;
        }}
      >
        {$t('lang.de')}
      </button>
      <button
        type="button"
        class="desktop-nav__dropdown-link"
        class:desktop-nav__dropdown-link--active={$locale === 'en'}
        aria-pressed={$locale === 'en'}
        onclick={() => {
          pickLocale('en');
          langMenuOpen = false;
        }}
      >
        {$t('lang.en')}
      </button>
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

  /** Keeps Players + Account aligned to the right (replaces former “Info” dropdown slot). */
  .desktop-nav__link--push-end {
    margin-left: auto;
  }

  .desktop-nav__dropdown--lang :global(.desktop-nav__dropdown-panel) {
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

  :global(
    .desktop-nav__dropdown-inner--account .desktop-nav__link.desktop-nav__link--dropdown-main
  ) {
    flex: 0 0 auto;
  }

  :global(button.desktop-nav__link.desktop-nav__link--dropdown-main.desktop-nav__lang-main) {
    flex: 1;
    min-width: 0;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    cursor: pointer;
    font: inherit;
    font-family: inherit;
    text-align: center;
  }

  .desktop-nav__dropdown-panel--lang {
    min-width: 10rem;
    padding: 6px;
  }

  .desktop-nav__dropdown-panel--lang :global(.desktop-nav__dropdown-link) {
    width: 100%;
    justify-content: center;
    text-align: center;
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
</style>
