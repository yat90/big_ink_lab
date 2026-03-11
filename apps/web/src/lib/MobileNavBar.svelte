<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconPlay from '$lib/icons/IconPlay.svelte';
  import IconMore from '$lib/icons/IconMore.svelte';

  interface Props {
    menuOpen: boolean;
    onMoreClick: () => void;
  }
  let { menuOpen = false, onMoreClick }: Props = $props();

  let showQuickMatchConfirm = $state(false);

  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') &&
      $page.url.pathname !== '/matches/new' &&
      $page.url.pathname !== '/matches/quick'
  );
  const isQuickMatch = $derived($page.url.pathname === '/matches/quick');
  const isStats = $derived($page.url.pathname === '/stats');

  function openQuickMatchConfirm() {
    showQuickMatchConfirm = true;
  }

  function closeQuickMatchConfirm() {
    showQuickMatchConfirm = false;
  }

  function startQuickMatch() {
    closeQuickMatchConfirm();
    goto('/matches/quick');
  }

  $effect(() => {
    if (!showQuickMatchConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickMatchConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<div class="mobile-nav">
  <div class="mobile-nav__bar">
    <nav class="mobile-nav__pill" aria-label="Primary">
      <a
        href="/matches"
        class="mobile-nav__item"
        class:mobile-nav__item--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconTrophy size={24} />
        </span>
        <span class="mobile-nav__item-label">Matches</span>
      </a>
      <a
        href="/stats"
        class="mobile-nav__item"
        class:mobile-nav__item--active={isStats}
        aria-current={isStats ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconBarChart size={24} />
        </span>
        <span class="mobile-nav__item-label">Statistics</span>
      </a>
      <button
        type="button"
        class="mobile-nav__item"
        class:mobile-nav__item--active={isQuickMatch}
        aria-current={isQuickMatch ? 'page' : undefined}
        onclick={openQuickMatchConfirm}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconPlay size={24} />
        </span>
        <span class="mobile-nav__item-label">Quick Match</span>
      </button>
    </nav>
    <button
      type="button"
      class="mobile-nav__more"
      aria-label={menuOpen ? 'Close menu' : 'More menu'}
      aria-expanded={menuOpen}
      aria-controls="mobile-nav-drawer"
      onclick={onMoreClick}
    >
      <span class="mobile-nav__more-icon" aria-hidden="true">
        <IconMore size={24} />
      </span>
    </button>
  </div>
</div>

{#if showQuickMatchConfirm}
  <div
    class="mobile-nav__confirm-backdrop"
    role="presentation"
    onclick={closeQuickMatchConfirm}
  ></div>
  <div class="mobile-nav__confirm" role="dialog" aria-modal="true" aria-labelledby="quick-match-confirm-title">
    <h3 id="quick-match-confirm-title" class="mobile-nav__confirm-title">Start quick match?</h3>
    <p class="mobile-nav__confirm-text">Do you really want to start a new quick match?</p>
    <div class="mobile-nav__confirm-actions">
      <button type="button" class="mobile-nav__confirm-btn mobile-nav__confirm-btn--cancel" onclick={closeQuickMatchConfirm}>
        Cancel
      </button>
      <button type="button" class="mobile-nav__confirm-btn mobile-nav__confirm-btn--primary" onclick={startQuickMatch}>
        Start
      </button>
    </div>
  </div>
{/if}
