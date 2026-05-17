<script lang="ts">
  import { page } from '$app/stores';
  import logo from '../../../images/bigInkLab.png';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconCircleUser from '$lib/icons/IconCircleUser.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconInfo from '$lib/icons/IconInfo.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconSparkle from '$lib/icons/IconSparkle.svelte';
  import IconTeam from '$lib/icons/IconTeam.svelte';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { locale, setLocale, t } from '$lib/i18n';
  import { TEAM_TAB_IDS } from '$lib/components/team/teamTabs';
  import { authMe } from '$lib/me';
  import { PRIMARY_NAV, TEAM_TAB_ICON_MAP, getNavRouteState } from '$lib/navConfig';

  interface Props {
    open: boolean;
    closeMenu: () => void;
    logout: () => Promise<void>;
  }
  let { open = false, closeMenu, logout }: Props = $props();

  const playerName = $derived(($authMe?.player?.name ?? '').trim());
  let showLogoutPrompt = $state(false);
  let statsOpen = $state(false);
  let teamOpen = $state(false);

  // Route active states
  const nav = $derived(getNavRouteState($page.url));

  // Reset states on close; auto-expand active sections on open
  $effect(() => {
    if (!open) {
      showLogoutPrompt = false;
      return;
    }
    statsOpen = nav.isMyStatistics || nav.isChangelog;
    teamOpen = nav.isTeam;
  });

  // Escape key: close logout prompt first, then close drawer
  $effect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showLogoutPrompt) { showLogoutPrompt = false; return; }
      closeMenu();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function confirmLogout() {
    showLogoutPrompt = false;
    closeMenu();
    void logout();
  }
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
    <!-- ── Header: logo + close button ─────────── -->
    <div class="mobile-nav__drawer-header">
      <img class="mobile-nav__drawer-header-logo" src={logo} alt="Big Ink Lab" />
      <button
        type="button"
        class="mobile-nav__drawer-close"
        aria-label={$t('common.closeMenu')}
        onclick={closeMenu}
      >
        <IconClose size={20} />
      </button>
    </div>

    <!-- ── Scrollable navigation body ──────────── -->
    <div class="mobile-nav__drawer-scroll">
      {#if playerName}
        <div class="mobile-nav__drawer-player">
          <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
            <IconCircleUser size={20} />
          </span>
          <span>{playerName}</span>
        </div>
      {/if}

      <!-- Main nav links -->
      <a
        href={PRIMARY_NAV.home.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isHome}
        aria-current={nav.isHome ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconSparkle size={22} />
        </span>
        {$t(PRIMARY_NAV.home.labelKey)}
      </a>

      <a
        href={PRIMARY_NAV.matches.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isMatches}
        aria-current={nav.isMatches ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconTrophy size={22} />
        </span>
        {$t(PRIMARY_NAV.matches.labelKey)}
      </a>

      <a
        href={PRIMARY_NAV.tournaments.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isTournaments}
        aria-current={nav.isTournaments ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconCrownOutline size={22} />
        </span>
        {$t(PRIMARY_NAV.tournaments.labelKey)}
      </a>

      <a
        href={PRIMARY_NAV.decks.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isDecks}
        aria-current={nav.isDecks ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconDecks size={22} />
        </span>
        {$t(PRIMARY_NAV.decks.labelKey)}
      </a>

      <!-- Team (collapsible with tab links) -->
      <div
        class="mobile-nav__drawer-group mobile-nav__drawer-group--collapsible"
        role="group"
        aria-label={$t('nav.teamSection')}
      >
        <div
          class="mobile-nav__drawer-subhead mobile-nav__drawer-subhead--collapsible"
          class:mobile-nav__drawer-subhead--expanded={teamOpen}
        >
          <a
            href={PRIMARY_NAV.team.href}
            class="mobile-nav__drawer-link mobile-nav__drawer-link--main"
            class:mobile-nav__drawer-link--active={nav.isTeam}
            onclick={closeMenu}
          >
            <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
              <IconTeam size={22} />
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
              width="16"
              height="16"
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
          <div id="mobile-nav-drawer-team-sub" class="mobile-nav__drawer-sub">
            <div
              class="mobile-nav__drawer-sub-panel"
              role="group"
              aria-label={$t('team.tablistLabel')}
            >
              {#each TEAM_TAB_IDS as tabId (tabId)}
                {@const TabIcon = TEAM_TAB_ICON_MAP[tabId]}
                <a
                  href="/team?tab={tabId}"
                  class="mobile-nav__drawer-link mobile-nav__drawer-link--sub mobile-nav__drawer-link--panel-item"
                  class:mobile-nav__drawer-link--active={nav.isTeam && nav.activeTeamTab === tabId}
                  aria-current={nav.isTeam && nav.activeTeamTab === tabId ? 'page' : undefined}
                  onclick={closeMenu}
                >
                  <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                    <TabIcon size={18} />
                  </span>
                  {$t(`team.tabs.${tabId}`)}
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Statistics (collapsible) -->
      <div
        class="mobile-nav__drawer-group mobile-nav__drawer-group--collapsible"
        role="group"
        aria-label={$t('nav.statisticsSection')}
      >
        <div
          class="mobile-nav__drawer-subhead mobile-nav__drawer-subhead--collapsible"
          class:mobile-nav__drawer-subhead--expanded={statsOpen}
        >
          <a
            href="/stats"
            class="mobile-nav__drawer-link mobile-nav__drawer-link--main"
            class:mobile-nav__drawer-link--active={nav.isStats && !nav.isMyStatistics}
            aria-current={nav.isStats && !nav.isMyStatistics ? 'page' : undefined}
            onclick={closeMenu}
          >
            <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
              <IconBarChart size={22} />
            </span>
            {$t('nav.statistics')}
          </a>
          <button
            type="button"
            class="mobile-nav__drawer-chevron-btn mobile-nav__drawer-chevron-btn--stats"
            id="mobile-nav-drawer-stats-toggle"
            aria-expanded={statsOpen}
            aria-controls="mobile-nav-drawer-stats-sub"
            aria-label={$t('nav.openStatisticsSubmenu')}
            onclick={() => (statsOpen = !statsOpen)}
          >
            <svg
              class="mobile-nav__drawer-chevron-svg"
              class:mobile-nav__drawer-chevron-svg--open={statsOpen}
              width="16"
              height="16"
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
            class="mobile-nav__drawer-sub"
            role="group"
            aria-labelledby="mobile-nav-drawer-stats-toggle"
          >
            <div class="mobile-nav__drawer-sub-panel">
              <a
                href="/me/statistics"
                class="mobile-nav__drawer-link mobile-nav__drawer-link--sub mobile-nav__drawer-link--panel-item"
                class:mobile-nav__drawer-link--active={nav.isMyStatistics}
                aria-current={nav.isMyStatistics ? 'page' : undefined}
                onclick={closeMenu}
              >
                <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                  <IconBarChart size={18} />
                </span>
                {$t('nav.myStatistics')}
              </a>
              <a
                href="/changelog"
                class="mobile-nav__drawer-link mobile-nav__drawer-link--sub mobile-nav__drawer-link--panel-item"
                class:mobile-nav__drawer-link--active={nav.isChangelog}
                aria-current={nav.isChangelog ? 'page' : undefined}
                onclick={closeMenu}
              >
                <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
                  <IconInfo size={18} />
                </span>
                {$t('nav.changelog')}
              </a>
            </div>
          </div>
        {/if}
      </div>

      <!-- Players -->
      <a
        href={PRIMARY_NAV.players.href}
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isPlayers}
        aria-current={nav.isPlayers ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconCircleUser size={22} />
        </span>
        {$t(PRIMARY_NAV.players.labelKey)}
      </a>
    </div>

    <!-- ── Footer: language + account + logout ── -->
    <div class="mobile-nav__drawer-footer">
      <div class="mobile-nav__drawer-lang-wrap">
        <div class="mobile-nav__drawer-lang">
          <button
            type="button"
            class="mobile-nav__drawer-lang-btn"
            class:mobile-nav__drawer-lang-btn--active={$locale === 'de'}
            aria-pressed={$locale === 'de'}
            onclick={() => setLocale('de')}
          >
            {$t('lang.deShort')}
          </button>
          <button
            type="button"
            class="mobile-nav__drawer-lang-btn"
            class:mobile-nav__drawer-lang-btn--active={$locale === 'en'}
            aria-pressed={$locale === 'en'}
            onclick={() => setLocale('en')}
          >
            {$t('lang.enShort')}
          </button>
        </div>
      </div>

      <a
        href="/me"
        class="mobile-nav__drawer-link"
        class:mobile-nav__drawer-link--active={nav.isMe}
        aria-current={nav.isMe ? 'page' : undefined}
        onclick={closeMenu}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconUser size={22} />
        </span>
        {$t('nav.mobileMe')}
      </a>

      <button
        type="button"
        class="mobile-nav__drawer-link mobile-nav__drawer-link--button mobile-nav__drawer-link--logout"
        onclick={() => (showLogoutPrompt = true)}
      >
        <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
          <IconLogOut size={22} />
        </span>
        {$t('nav.logOut')}
      </button>

      <div class="mobile-nav__drawer-divider" role="separator" aria-hidden="true"></div>

      <button type="button" class="mobile-nav__drawer-footer-close btn" onclick={closeMenu}>
        <IconClose size={20} />
        {$t('common.closeMenu')}
      </button>
    </div>

    <!-- ── Logout confirmation modal ─────────── -->
    {#if showLogoutPrompt}
      <div
        class="logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <button
          type="button"
          class="logout-modal__backdrop"
          aria-label={$t('nav.logOutCancel')}
          onclick={() => (showLogoutPrompt = false)}
        ></button>
        <div
          class="logout-modal__card card"
          use:focusTrap={{ focusRoot: true }}
          use:scrollLock
        >
          <h2 id="logout-confirm-title" class="logout-modal__title">
            {$t('nav.logOutConfirmTitle')}
          </h2>
          <p class="logout-modal__text muted">{$t('nav.logOutConfirmBody')}</p>
          <div class="logout-modal__actions row">
            <button type="button" class="btn btn--primary btn--icon" onclick={confirmLogout}>
              <IconLogOut size={18} />
              {$t('nav.logOut')}
            </button>
            <button type="button" class="btn" onclick={() => (showLogoutPrompt = false)}>
              {$t('nav.logOutCancel')}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </nav>
{/if}

<style>
  .logout-modal {
    position: fixed;
    inset: 0;
    z-index: 1300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .logout-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .logout-modal__card {
    position: relative;
    z-index: 1;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .logout-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }

  .logout-modal__text {
    margin: 0 0 20px;
  }

  .logout-modal__actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
