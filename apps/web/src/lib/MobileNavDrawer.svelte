<script lang="ts">
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconTeam from '$lib/icons/IconTeam.svelte';
  import IconCircleUser from '$lib/icons/IconCircleUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconPenalties from '$lib/icons/IconPenalties.svelte';
  import IconCloud from '$lib/icons/IconCloud.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { locale, setLocale, t } from '$lib/i18n';
  import type { Locale } from '$lib/i18n';
  import { TEAM_TAB_IDS, teamTabFromSearchParams, type TeamTabId } from '$lib/teamTabs';
  import { authMe } from '$lib/me';
  import { PRIMARY_NAV, isPrimaryNavActive } from '$lib/navConfig';

  function pickLocale(next: Locale) {
    setLocale(next);
  }

  interface Props {
    open: boolean;
    closeMenu: () => void;
    logout: () => Promise<void>;
  }
  let { open = false, closeMenu, logout }: Props = $props();

  const playerName = $derived(($authMe?.player?.name ?? '').trim());

  let showLogoutPrompt = $state(false);

  function openLogoutPrompt() {
    showLogoutPrompt = true;
  }

  function closeLogoutPrompt() {
    showLogoutPrompt = false;
  }

  async function confirmLogout() {
    closeLogoutPrompt();
    closeMenu();
    await logout();
  }

  $effect(() => {
    if (!open) showLogoutPrompt = false;
  });

  const isHome = $derived(isPrimaryNavActive('home', $page.url.pathname));
  const isMatches = $derived(isPrimaryNavActive('matches', $page.url.pathname));
  const isTournaments = $derived(isPrimaryNavActive('tournaments', $page.url.pathname));
  const isStats = $derived($page.url.pathname === '/stats');
  const isMyStatistics = $derived($page.url.pathname === '/me/statistics');
  const isDecks = $derived(isPrimaryNavActive('decks', $page.url.pathname));
  const isPlayers = $derived(isPrimaryNavActive('players', $page.url.pathname));
  const isTeam = $derived(isPrimaryNavActive('team', $page.url.pathname));
  const activeTeamTab = $derived(
    $page.url.pathname.startsWith('/team') ? teamTabFromSearchParams($page.url.searchParams) : null
  );

  const TEAM_TAB_ICON_MAP: Record<
    TeamTabId,
    | typeof IconUsers
    | typeof IconTrophy
    | typeof IconPenalties
    | typeof IconGavel
    | typeof IconBarChart
    | typeof IconCloud
  > = {
    members: IconUsers,
    ranking: IconTrophy,
    penalties: IconPenalties,
    court: IconGavel,
    finance: IconBarChart,
    links: IconCloud,
  };

  const isMe = $derived($page.url.pathname === '/me');

  let statsOpen = $state(false);
  let teamOpen = $state(false);
  let accountOpen = $state(false);

  $effect(() => {
    if (!open) return;
    statsOpen = isMyStatistics;
    teamOpen = isTeam;
    accountOpen = isMe;
  });

  $effect(() => {
    if (!open) return;
    const logoutPromptOpen = showLogoutPrompt;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (logoutPromptOpen) {
        closeLogoutPrompt();
        return;
      }
      closeMenu();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

{#if open}
  <div class="mobile-nav__backdrop" role="presentation" onclick={closeMenu}></div>
  <nav
    id="mobile-nav-drawer"
    class="mobile-nav__drawer"
    aria-label={$t('nav.mobileMenu')}
    use:focusTrap
    use:scrollLock
  >
    <button
      type="button"
      class="mobile-nav__drawer-close"
      aria-label={$t('common.closeMenu')}
      onclick={closeMenu}
    >
      <IconClose size={24} />
    </button>
    <div class="mobile-nav__drawer-scroll">
      <div class="mobile-nav__drawer-header">
        <img class="mobile-nav__drawer-header-logo" src={logo} alt="" width="128" height="128" />
      </div>
      <a
        href={PRIMARY_NAV.home.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={isHome}
        aria-current={isHome ? 'page' : undefined}
        onclick={closeMenu}
      >
        {$t(PRIMARY_NAV.home.labelKey)}
      </a>
      <a
        href={PRIMARY_NAV.matches.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconTrophy size={24} />
        </span>
        {$t(PRIMARY_NAV.matches.labelKey)}
      </a>
      <a
        href={PRIMARY_NAV.tournaments.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={isTournaments}
        aria-current={isTournaments ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconCrownOutline size={24} />
        </span>
        {$t(PRIMARY_NAV.tournaments.labelKey)}
      </a>
      <a
        href={PRIMARY_NAV.decks.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={isDecks}
        aria-current={isDecks ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconDecks size={24} />
        </span>
        {$t(PRIMARY_NAV.decks.labelKey)}
      </a>
      <a
        href={PRIMARY_NAV.players.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={isPlayers}
        aria-current={isPlayers ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconCircleUser size={24} />
        </span>
        {$t(PRIMARY_NAV.players.labelKey)}
      </a>
      <div class="mobile-nav__drawer-group" role="group" aria-label={$t('nav.statisticsSection')}>
        <div class="mobile-nav__drawer-subhead">
          <a
            href="/stats"
            class="mobile-nav__drawer-link mobile-nav__drawer-link--main"
            class:mobile-nav__drawer-link--active={isStats && !isMyStatistics}
            aria-current={isStats && !isMyStatistics ? 'page' : undefined}
            onclick={closeMenu}
          >
            <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
              <IconBarChart size={24} />
            </span>
            {$t('nav.statistics')}
          </a>
          <button
            type="button"
            class="mobile-nav__drawer-chevron-btn"
            id="mobile-nav-drawer-stats-toggle"
            aria-expanded={statsOpen}
            aria-controls="mobile-nav-drawer-stats-sub"
            aria-label={$t('nav.openStatisticsSubmenu')}
            onclick={() => (statsOpen = !statsOpen)}
          >
            <svg
              class="mobile-nav__drawer-chevron-svg"
              class:mobile-nav__drawer-chevron-svg--open={statsOpen}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
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
        {#if statsOpen}
          <div
            id="mobile-nav-drawer-stats-sub"
            role="group"
            aria-labelledby="mobile-nav-drawer-stats-toggle"
          >
            <a
              href="/me/statistics"
              class="mobile-nav__drawer-link mobile-nav__drawer-link--sub"
              class:mobile-nav__drawer-link--active={isMyStatistics}
              aria-current={isMyStatistics ? 'page' : undefined}
              onclick={closeMenu}
            >
              <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                <IconBarChart size={20} />
              </span>
              {$t('nav.myStatistics')}
            </a>
          </div>
        {/if}
      </div>
      <div
        class="mobile-nav__drawer-group mobile-nav__drawer-group--team"
        role="group"
        aria-label={$t('nav.teamSection')}
      >
        <div
          class="mobile-nav__drawer-subhead mobile-nav__drawer-subhead--team"
          class:mobile-nav__drawer-subhead--team-expanded={teamOpen}
        >
          <a
            href={PRIMARY_NAV.team.href}
            class="mobile-nav__drawer-link mobile-nav__drawer-link--main"
            class:mobile-nav__drawer-link--active={isTeam}
            onclick={closeMenu}
          >
            <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
              <IconTeam size={24} />
            </span>
            {$t(PRIMARY_NAV.team.labelKey)}
          </a>
          <button
            type="button"
            class="mobile-nav__drawer-chevron-btn mobile-nav__drawer-chevron-btn--team"
            id="mobile-nav-drawer-team-toggle"
            aria-expanded={teamOpen}
            aria-controls="mobile-nav-drawer-team-sub"
            aria-label={$t('nav.openTeamSubmenu')}
            onclick={() => (teamOpen = !teamOpen)}
          >
            <svg
              class="mobile-nav__drawer-chevron-svg"
              class:mobile-nav__drawer-chevron-svg--open={teamOpen}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
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
        {#if teamOpen}
          <div id="mobile-nav-drawer-team-sub" class="mobile-nav__drawer-team-sub">
            <div
              class="mobile-nav__drawer-team-heading muted"
              id="mobile-nav-drawer-team-sub-label"
            >
              {$t('team.tablistLabel')}
            </div>
            <div
              class="mobile-nav__drawer-team-panel"
              role="group"
              aria-labelledby="mobile-nav-drawer-team-sub-label"
            >
              {#each TEAM_TAB_IDS as tabId (tabId)}
                {@const TabIcon = TEAM_TAB_ICON_MAP[tabId]}
                <a
                  href="/team?tab={tabId}"
                  class="mobile-nav__drawer-link mobile-nav__drawer-link--sub mobile-nav__drawer-link--team-tab"
                  class:mobile-nav__drawer-link--active={isTeam && activeTeamTab === tabId}
                  aria-current={isTeam && activeTeamTab === tabId ? 'page' : undefined}
                  onclick={closeMenu}
                >
                  <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                    <TabIcon size={20} />
                  </span>
                  {$t(`team.tabs.${tabId}`)}
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div
        class="mobile-nav__drawer-group mobile-nav__drawer-group--language"
        role="group"
        aria-labelledby="mobile-nav-drawer-lang-label"
      >
        <div class="mobile-nav__drawer-lang-wrap">
          <div class="mobile-nav__drawer-lang-label muted" id="mobile-nav-drawer-lang-label">
            {$t('common.language')}
          </div>
          <div class="mobile-nav__drawer-lang">
            <button
              type="button"
              class="mobile-nav__drawer-lang-btn"
              class:mobile-nav__drawer-lang-btn--active={$locale === 'de'}
              aria-pressed={$locale === 'de'}
              onclick={() => pickLocale('de')}
            >
              {$t('lang.deShort')}
            </button>
            <button
              type="button"
              class="mobile-nav__drawer-lang-btn"
              class:mobile-nav__drawer-lang-btn--active={$locale === 'en'}
              aria-pressed={$locale === 'en'}
              onclick={() => pickLocale('en')}
            >
              {$t('lang.enShort')}
            </button>
          </div>
        </div>
      </div>
      <div class="mobile-nav__drawer-group" role="group" aria-label={$t('nav.accountSection')}>
        {#if playerName}
          <p class="mobile-nav__drawer-player-name muted" role="presentation">{playerName}</p>
        {/if}
        <div class="mobile-nav__drawer-subhead">
          <a
            href="/me"
            class="mobile-nav__drawer-link mobile-nav__drawer-link--main"
            class:mobile-nav__drawer-link--active={isMe}
            aria-current={isMe ? 'page' : undefined}
            onclick={closeMenu}
          >
            <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
              <IconUser size={24} />
            </span>
            {$t('nav.mobileMe')}
          </a>
          <button
            type="button"
            class="mobile-nav__drawer-chevron-btn"
            id="mobile-nav-drawer-account-toggle"
            aria-expanded={accountOpen}
            aria-controls="mobile-nav-drawer-account-sub"
            aria-label={$t('nav.openAccountMenu')}
            onclick={() => (accountOpen = !accountOpen)}
          >
            <svg
              class="mobile-nav__drawer-chevron-svg"
              class:mobile-nav__drawer-chevron-svg--open={accountOpen}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
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
        {#if accountOpen}
          <div
            id="mobile-nav-drawer-account-sub"
            role="group"
            aria-labelledby="mobile-nav-drawer-account-toggle"
          >
            <button
              type="button"
              class="mobile-nav__drawer-link mobile-nav__drawer-link--sub mobile-nav__drawer-link--button"
              onclick={openLogoutPrompt}
            >
              <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                <IconLogOut size={20} />
              </span>
              {$t('nav.logOut')}
            </button>
          </div>
        {/if}
      </div>
      <div class="mobile-nav__drawer-divider" role="separator" aria-hidden="true"></div>
      <button type="button" class="mobile-nav__drawer-footer-close btn" onclick={closeMenu}>
        <IconClose size={22} />
        {$t('common.closeMenu')}
      </button>
    </div>

    {#if showLogoutPrompt}
      <div
        class="mobile-nav-logout-modal delete-game-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <button
          type="button"
          class="delete-game-modal__backdrop"
          aria-label={$t('nav.logOutCancel')}
          onclick={closeLogoutPrompt}
        ></button>
        <div
          class="delete-game-modal__card card"
          use:focusTrap={{ focusRoot: true }}
          use:scrollLock
        >
          <h2 id="logout-confirm-title" class="delete-game-modal__title">
            {$t('nav.logOutConfirmTitle')}
          </h2>
          <p class="delete-game-modal__text muted">{$t('nav.logOutConfirmBody')}</p>
          <div class="delete-game-modal__actions row">
            <button
              type="button"
              class="btn btn--primary btn--icon"
              onclick={() => void confirmLogout()}
            >
              <IconLogOut size={18} />
              {$t('nav.logOut')}
            </button>
            <button type="button" class="btn" onclick={closeLogoutPrompt}
              >{$t('nav.logOutCancel')}</button
            >
          </div>
        </div>
      </div>
    {/if}
  </nav>
{/if}

<style>
  .mobile-nav__drawer-player-name {
    margin: 0;
    padding: 6px 16px 2px;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .mobile-nav-logout-modal.delete-game-modal {
    z-index: 1300;
  }
  .delete-game-modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .delete-game-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .delete-game-modal__card {
    position: relative;
    z-index: 1;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }
  .delete-game-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }
  .delete-game-modal__text {
    margin: 0 0 20px;
  }
  .delete-game-modal__actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
