<script lang="ts">
  import { page } from '$app/stores';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconSparkle from '$lib/icons/IconSparkle.svelte';
  import IconMore from '$lib/icons/IconMore.svelte';

  interface Props {
    menuOpen: boolean;
    onMoreClick: () => void;
  }
  let { menuOpen = false, onMoreClick }: Props = $props();

  const isDashboard = $derived($page.url.pathname === '/');
  const isMatches = $derived(
    $page.url.pathname.startsWith('/matches') &&
      $page.url.pathname !== '/matches/new' &&
      $page.url.pathname !== '/matches/quick'
  );
  const isTournaments = $derived($page.url.pathname.startsWith('/tournaments'));
</script>

<div class="mobile-nav">
  <div class="mobile-nav__bar">
    <nav class="mobile-nav__pill" aria-label="Primary">
      <a
        href="/"
        class="mobile-nav__item"
        class:mobile-nav__item--active={isDashboard}
        aria-current={isDashboard ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconSparkle size={24} />
        </span>
        <span class="mobile-nav__item-label">Dashboard</span>
      </a>
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
        href="/tournaments"
        class="mobile-nav__item"
        class:mobile-nav__item--active={isTournaments}
        aria-current={isTournaments ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconCrownOutline size={24} />
        </span>
        <span class="mobile-nav__item-label">Tournaments</span>
      </a>
      <button
        type="button"
        class="mobile-nav__item mobile-nav__item--more"
        aria-label={menuOpen ? 'Close menu' : 'More menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-drawer"
        onclick={onMoreClick}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconMore size={24} />
        </span>
        <span class="mobile-nav__item-label">More</span>
      </button>
    </nav>
  </div>
</div>
