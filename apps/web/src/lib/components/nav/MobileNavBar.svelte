<script lang="ts">
  import { page } from '$app/stores';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconCrownOutline from '$lib/icons/IconCrownOutline.svelte';
  import IconSparkle from '$lib/icons/IconSparkle.svelte';
  import IconMore from '$lib/icons/IconMore.svelte';
  import { t } from '$lib/i18n';
  import { PRIMARY_NAV, isPrimaryNavActive } from '$lib/navConfig';

  interface Props {
    menuOpen: boolean;
    onMoreClick: () => void;
  }
  let { menuOpen = false, onMoreClick }: Props = $props();

  const isDashboard = $derived(isPrimaryNavActive('home', $page.url.pathname));
  const isMatches = $derived(isPrimaryNavActive('matches', $page.url.pathname));
  const isTournaments = $derived(isPrimaryNavActive('tournaments', $page.url.pathname));
</script>

<div class="mobile-nav">
  <div class="mobile-nav__bar">
    <nav class="mobile-nav__pill" aria-label="Primary">
      <a
        href={PRIMARY_NAV.home.href}
        class="mobile-nav__item"
        class:mobile-nav__item--active={isDashboard}
        aria-current={isDashboard ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconSparkle size={24} />
        </span>
        <span class="mobile-nav__item-label">{$t(PRIMARY_NAV.home.labelKey)}</span>
      </a>
      <a
        href={PRIMARY_NAV.matches.href}
        class="mobile-nav__item"
        class:mobile-nav__item--active={isMatches}
        aria-current={isMatches ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconTrophy size={24} />
        </span>
        <span class="mobile-nav__item-label">{$t(PRIMARY_NAV.matches.labelKey)}</span>
      </a>
      <a
        href={PRIMARY_NAV.tournaments.href}
        class="mobile-nav__item"
        class:mobile-nav__item--active={isTournaments}
        aria-current={isTournaments ? 'page' : undefined}
      >
        <span class="mobile-nav__item-icon" aria-hidden="true">
          <IconCrownOutline size={24} />
        </span>
        <span class="mobile-nav__item-label">{$t(PRIMARY_NAV.tournaments.labelKey)}</span>
      </a>
      <button
        type="button"
        class="mobile-nav__item mobile-nav__item--more"
        class:mobile-nav__item--active={menuOpen}
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
