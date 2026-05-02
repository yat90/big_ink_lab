<script lang="ts">
  import { page } from '$app/stores';
  import logo from '../images/bigInkLab.png';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconDecks from '$lib/icons/IconDecks.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconTeam from '$lib/icons/IconTeam.svelte';
  import IconUser from '$lib/icons/IconUser.svelte';
  import IconLogOut from '$lib/icons/IconLogOut.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';

  interface Props {
    open: boolean;
    closeMenu: () => void;
    logout: () => Promise<void>;
  }
  let { open = false, closeMenu, logout }: Props = $props();

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

  const isHome = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') &&
      $page.url.pathname !== '/matches/new' &&
      $page.url.pathname !== '/matches/quick'
  );
  const isTournaments = $derived($page.url.pathname.startsWith('/tournaments'));
  const isStats = $derived($page.url.pathname === '/stats');
  const isMyStatistics = $derived($page.url.pathname === '/me/statistics');
  const isDecks = $derived(
    $page.url.pathname === '/decks' || $page.url.pathname.startsWith('/decks/')
  );
  const isPlayers = $derived(
    $page.url.pathname === '/players' || $page.url.pathname.startsWith('/players/')
  );
  const isTeam = $derived($page.url.pathname.startsWith('/team'));
  const isMe = $derived($page.url.pathname === '/me');

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
    aria-label="More menu"
    use:focusTrap
    use:scrollLock
  >
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
      href="/tournaments"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isTournaments}
      aria-current={isTournaments ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconCrownOutline size={24} />
      </span>
      Tournaments
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
    <div class="mobile-nav__drawer-group" role="group" aria-label="Statistics">
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
        href="/me/statistics"
        class="mobile-nav__drawer-link mobile-nav__drawer-link--sub"
        class:mobile-nav__drawer-link--active={isMyStatistics}
        aria-current={isMyStatistics ? 'page' : undefined}
        onclick={closeMenu}
      >
        My statistics
      </a>
    </div>
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
    <a
      href="/team"
      class="mobile-nav__drawer-link"
      class:mobile-nav__drawer-link--active={isTeam}
      aria-current={isTeam ? 'page' : undefined}
      onclick={closeMenu}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconTeam size={24} />
      </span>
      Team
    </a>
    <button
      type="button"
      class="mobile-nav__drawer-link mobile-nav__drawer-link--button"
      onclick={openLogoutPrompt}
    >
      <span class="mobile-nav__drawer-link-icon" aria-hidden="true">
        <IconLogOut size={24} />
      </span>
      Logout
    </button>
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
      class="mobile-nav__drawer-footer-close btn"
      onclick={closeMenu}
    >
      <IconClose size={22} />
      Close menu
    </button>

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
          aria-label="Cancel"
          onclick={closeLogoutPrompt}
        ></button>
        <div class="delete-game-modal__card card" use:focusTrap={{ focusRoot: true }} use:scrollLock>
          <h2 id="logout-confirm-title" class="delete-game-modal__title">Log out?</h2>
          <p class="delete-game-modal__text muted">Do you really want to log out of Big Ink Lab?</p>
          <div class="delete-game-modal__actions row">
            <button type="button" class="btn btn--primary btn--icon" onclick={() => void confirmLogout()}>
              <IconLogOut size={18} />
              Log out
            </button>
            <button type="button" class="btn" onclick={closeLogoutPrompt}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}
  </nav>
{/if}

<style>
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
