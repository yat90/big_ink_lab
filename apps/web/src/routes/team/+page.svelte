<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authMe } from '$lib/me';
  import { fetchTeamOverview, type TeamOverview } from '$lib/components/team/team-analytics';
  import { getLocale, translate, t } from '$lib/i18n';
  import { TEAM_TAB_IDS, teamTabFromSearchParams, type TeamTabId } from '$lib/components/team/teamTabs';
  import TeamTabOverview from './TeamTabOverview.svelte';
  import TeamTabMembers from './TeamTabMembers.svelte';
  import TeamTabRanking from './TeamTabRanking.svelte';
  import TeamTabFinance from './TeamTabFinance.svelte';
  import TeamTabPenalties from './TeamTabPenalties.svelte';
  import TeamTabCourt from './TeamTabCourt.svelte';
  import TeamTabLinks from './TeamTabLinks.svelte';
  import IconChevronLeft from '$lib/icons/IconChevronLeft.svelte';
  import IconChevronRight from '$lib/icons/IconChevronRight.svelte';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';
  import { TEAM_TAB_ICON_MAP } from '$lib/navConfig';

  let overview = $state<TeamOverview | null>(null);
  let loading = $state(true);
  let error = $state('');

  const activeTab = $derived(teamTabFromSearchParams($page.url.searchParams));

  const isAdmin = $derived(overview?.role === 'admin');

  function selectTeamTab(id: TeamTabId) {
    void goto(`/team?tab=${id}`, { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function loadOverview() {
    loading = true;
    error = '';
    try {
      overview = await fetchTeamOverview();
    } catch (err) {
      error = err instanceof Error ? err.message : translate(getLocale(), 'team.loadError');
    } finally {
      loading = false;
    }
  }

  function handleTabRefresh() {
    void loadOverview();
  }

  let teamTabsEl = $state<HTMLDivElement | null>(null);
  let tabsFadeLeft = $state(false);
  let tabsFadeRight = $state(false);

  function syncTeamTabsScroll() {
    const el = teamTabsEl;
    if (!el) {
      tabsFadeLeft = false;
      tabsFadeRight = false;
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const eps = 3;
    if (maxScroll <= eps) {
      tabsFadeLeft = false;
      tabsFadeRight = false;
      return;
    }
    tabsFadeLeft = scrollLeft > eps;
    tabsFadeRight = scrollLeft < maxScroll - eps;
  }

  function scrollTeamTabs(direction: -1 | 1) {
    const el = teamTabsEl;
    if (!el) return;
    const step = Math.max(120, Math.floor(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  $effect(() => {
    const el = teamTabsEl;
    if (!el) return;
    syncTeamTabsScroll();
    const ro = new ResizeObserver(() => syncTeamTabsScroll());
    ro.observe(el);
    el.addEventListener('scroll', syncTeamTabsScroll, { passive: true });
    window.addEventListener('resize', syncTeamTabsScroll);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', syncTeamTabsScroll);
      window.removeEventListener('resize', syncTeamTabsScroll);
    };
  });

  onMount(() => {
    void loadOverview();
    return registerPageRefresh(loadOverview);
  });
</script>

<svelte:head>
  <title>{$t('team.pageTitle')}</title>
</svelte:head>

<div class="page page--team">
  {#if loading && !overview}
    <AppCard className="team-skeleton" aria-busy="true" aria-live="polite">
      <div class="loading-skeleton__line loading-skeleton__line--title"></div>
      <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      <div class="loading-skeleton__line"></div>
    </AppCard>
  {:else if error}
    <AppCard role="alert">
      <AppBanner variant="danger" message={error} />
      <AppButton type="button" onclick={() => void loadOverview()}>{$t('common.retry')}</AppButton>
    </AppCard>
  {:else if overview && !overview.hasTeam}
    <AppCard className="stack">
      <h1 class="card__title">{$t('team.noTeamTitle')}</h1>
      <p class="card__sub">
        {$t('team.noTeamBefore')}<a href="/me">{$t('team.noTeamLink')}</a>{$t('team.noTeamAfter')}
      </p>
    </AppCard>
  {:else if overview}
    <div
      class="team-tabs-wrap"
      class:team-tabs-wrap--fade-left={tabsFadeLeft}
      class:team-tabs-wrap--fade-right={tabsFadeRight}
    >
      {#if tabsFadeLeft}
        <button
          type="button"
          class="team-tabs__edge team-tabs__edge--prev"
          aria-label={$t('team.tabsScrollPrevious')}
          onclick={() => scrollTeamTabs(-1)}
        >
          <IconChevronLeft size={20} className="team-tabs__edge-icon" />
        </button>
      {/if}
      {#if tabsFadeRight}
        <button
          type="button"
          class="team-tabs__edge team-tabs__edge--next"
          aria-label={$t('team.tabsScrollNext')}
          onclick={() => scrollTeamTabs(1)}
        >
          <IconChevronRight size={20} className="team-tabs__edge-icon" />
        </button>
      {/if}
      <div
        class="team-tabs"
        bind:this={teamTabsEl}
        role="tablist"
        aria-label={$t('team.tablistLabel')}
      >
        {#each TEAM_TAB_IDS as tabId (tabId)}
          {@const TabIcon = TEAM_TAB_ICON_MAP[tabId]}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            aria-controls="team-panel-{tabId}"
            id="team-tab-{tabId}"
            class="team-tab"
            class:team-tab--active={activeTab === tabId}
            onclick={() => selectTeamTab(tabId)}
          >
            <span class="team-tab__icon" aria-hidden="true">
              <TabIcon size={18} className="team-tab__icon-svg" />
            </span>
            <span class="team-tab__label">{$t(`team.tabs.${tabId}`)}</span>
          </button>
        {/each}
      </div>
    </div>

    <div
      id="team-panel-overview"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-overview"
      hidden={activeTab !== 'overview'}
    >
      {#if activeTab === 'overview'}
        <TeamTabOverview {overview} {isAdmin} />
      {/if}
    </div>

    <div
      id="team-panel-members"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-members"
      hidden={activeTab !== 'members'}
    >
      {#if activeTab === 'members'}
        <TeamTabMembers
          {isAdmin}
          team={overview.team}
          currentPlayerId={overview.playerId}
          onChange={handleTabRefresh}
        />
      {/if}
    </div>

    <div
      id="team-panel-ranking"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-ranking"
      hidden={activeTab !== 'ranking'}
    >
      {#if activeTab === 'ranking' && overview.internalRanking && overview.internalHeadToHead}
        <TeamTabRanking
          rows={overview.internalRanking}
          matrix={overview.internalHeadToHead}
          currentPlayerId={overview.playerId}
        />
      {/if}
    </div>

    <div
      id="team-panel-penalties"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-penalties"
      hidden={activeTab !== 'penalties'}
    >
      {#if activeTab === 'penalties'}
        <TeamTabPenalties {isAdmin} />
      {/if}
    </div>

    <div
      id="team-panel-court"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-court"
      hidden={activeTab !== 'court'}
    >
      {#if activeTab === 'court'}
        <TeamTabCourt {isAdmin} currentPlayerId={overview.playerId} />
      {/if}
    </div>

    <div
      id="team-panel-finance"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-finance"
      hidden={activeTab !== 'finance'}
    >
      {#if activeTab === 'finance'}
        <TeamTabFinance
          {isAdmin}
          balance={overview.balance}
          authMeStore={authMe}
          onChange={handleTabRefresh}
        />
      {/if}
    </div>

    <div
      id="team-panel-links"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-links"
      hidden={activeTab !== 'links'}
    >
      {#if activeTab === 'links'}
        <TeamTabLinks />
      {/if}
    </div>
  {/if}
</div>

<style>
  .page--team {
    max-width: 960px;
    padding-bottom: 25px;
  }

  :global(.team-skeleton) {
    padding: var(--space-lg);
  }

  .team-context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-bottom: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--glass-bg);
  }

  .team-context__link {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--primary);
    text-decoration: none;
  }

  .team-context__link:hover {
    text-decoration: underline;
  }

  .team-context__link:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .team-context__name {
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .team-tabs-wrap {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bg);
    margin: 0 0 var(--space-md) 0;
    border-bottom: 1px solid var(--border);
  }

  .team-tabs-wrap::before,
  .team-tabs-wrap::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2rem;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .team-tabs-wrap--fade-left::before {
    opacity: 1;
    left: 0;
    background: linear-gradient(to right, var(--bg), transparent);
  }

  .team-tabs-wrap--fade-right::after {
    opacity: 1;
    right: 0;
    background: linear-gradient(to left, var(--bg), transparent);
  }

  .team-tabs__edge {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 6px;
    font-family: inherit;
    cursor: pointer;
    color: var(--muted);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }

  .team-tabs__edge:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--bg) 96%, var(--border) 4%);
  }

  .team-tabs__edge:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .team-tabs__edge--prev {
    left: 0;
  }

  .team-tabs__edge--next {
    right: 0;
  }

  :global(.team-tabs__edge-icon) {
    display: block;
    flex-shrink: 0;
  }

  .team-tabs-wrap--fade-left .team-tabs {
    padding-left: 1.75rem;
  }

  .team-tabs-wrap--fade-right .team-tabs {
    padding-right: 1.75rem;
  }

  .team-tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
  }

  .team-tabs::-webkit-scrollbar {
    display: none;
  }

  .team-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 0.85rem;
    font-size: 0.9rem;
    line-height: 1.2;
    font-weight: 600;
    font-family: inherit;
    color: var(--muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    margin-bottom: -1px;
    transition:
      color var(--transition),
      border-color var(--transition),
      background var(--transition);
    white-space: nowrap;
  }

  .team-tab__icon {
    display: flex;
    flex-shrink: 0;
    color: var(--muted);
    transition: color var(--transition);
  }

  :global(.team-tab__icon-svg) {
    display: block;
  }

  .team-tab:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--primary) 8%, transparent);
  }

  .team-tab:hover .team-tab__icon {
    color: var(--fg);
  }

  .team-tab--active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .team-tab--active .team-tab__icon {
    color: var(--primary);
  }

  @media (min-width: 640px) {
    .team-tab {
      gap: 0.5rem;
      padding: 0.7rem 1rem;
      font-size: 1rem;
    }
  }

  .team-panel[hidden] {
    display: none;
  }
</style>
