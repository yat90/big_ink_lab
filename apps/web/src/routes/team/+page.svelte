<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authMe } from '$lib/me';
  import { fetchTeamOverview, formatMoney, type TeamOverview } from '$lib/team';
  import { getLocale, translate, t } from '$lib/i18n';
  import { TEAM_TAB_IDS, teamTabFromSearchParams, type TeamTabId } from '$lib/teamTabs';
  import TeamMembersTab from './TeamMembersTab.svelte';
  import TeamRankingTab from './TeamRankingTab.svelte';
  import TeamFinanceTab from './TeamFinanceTab.svelte';
  import TeamPenaltiesTab from './TeamPenaltiesTab.svelte';
  import TeamCourtRoomTab from './TeamCourtRoomTab.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import IconTrophy from '$lib/icons/IconTrophy.svelte';
  import IconPenalties from '$lib/icons/IconPenalties.svelte';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconChevronLeft from '$lib/icons/IconChevronLeft.svelte';
  import IconChevronRight from '$lib/icons/IconChevronRight.svelte';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';

  const TEAM_TAB_ICON_MAP = {
    members: IconUsers,
    ranking: IconTrophy,
    penalties: IconPenalties,
    court: IconGavel,
    finance: IconBarChart,
  } as const;

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
      error =
        err instanceof Error ? err.message : translate(getLocale(), 'team.loadError');
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
    <div class="card team-skeleton" aria-busy="true" aria-live="polite">
      <div class="loading-skeleton__line loading-skeleton__line--title"></div>
      <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      <div class="loading-skeleton__line"></div>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <button type="button" class="btn" onclick={() => void loadOverview()}>{$t('common.retry')}</button>
    </div>
  {:else if overview && !overview.hasTeam}
    <div class="card stack">
      <h1 class="card__title">{$t('team.noTeamTitle')}</h1>
      <p class="card__sub">
        {$t('team.noTeamBefore')}<a href="/me">{$t('team.noTeamLink')}</a>{$t('team.noTeamAfter')}</p>
    </div>
  {:else if overview}
    <div class="team-header card">
      <div class="team-header__hero">
        <div class="team-header__identity">
          <h1 class="team-header__title">{overview.team}</h1>
          <p class="team-header__sub muted">
            {#if isAdmin}
              {$t('team.header.youManage')}
            {:else}
              {$t('team.header.youAreMember')}
            {/if}
            {#if overview.balance && overview.balance.monthlyDues > 0}
              <span class="team-header__sub-sep" aria-hidden="true">·</span>
              {formatMoney(overview.balance.monthlyDues)}{$t('team.header.monthlyDues')}
            {/if}
          </p>
        </div>
        {#if overview.balance}
          <div class="team-header__treasury" aria-live="polite">
            <span class="team-header__treasury-label">{$t('team.header.treasury')}</span>
            <span
              class="team-header__treasury-value"
              class:team-header__treasury-value--neg={overview.balance.balance < 0}
            >
              {formatMoney(overview.balance.balance)}
            </span>
          </div>
        {/if}
      </div>
      <div class="team-header__metrics" role="group" aria-label={$t('team.header.metricsGroupLabel')}>
        <div class="team-metric">
          <IconUsers size={22} className="team-metric__icon" />
          <div class="team-metric__text">
            <span class="team-metric__value">{overview.balance?.memberCount ?? 0}</span>
            <span class="team-metric__label">{$t('team.header.statMembers')}</span>
          </div>
        </div>
        {#if overview.openAccusationsCount != null}
          <a
            href="/team?tab=court"
            class="team-metric team-metric--link"
            class:team-metric--alert={overview.openAccusationsCount > 0}
            aria-label={$t('team.header.openCourtRoomAria')}
          >
            <IconGavel size={22} className="team-metric__icon" />
            <div class="team-metric__text">
              <span class="team-metric__value">{overview.openAccusationsCount}</span>
              <span class="team-metric__label">{$t('team.header.statOpenAccusations')}</span>
            </div>
          </a>
        {/if}
      </div>
    </div>

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
      id="team-panel-members"
      class="team-panel"
      role="tabpanel"
      aria-labelledby="team-tab-members"
      hidden={activeTab !== 'members'}
    >
      {#if activeTab === 'members'}
        <TeamMembersTab
          isAdmin={isAdmin}
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
        <TeamRankingTab
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
        <TeamPenaltiesTab isAdmin={isAdmin} />
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
        <TeamCourtRoomTab isAdmin={isAdmin} currentPlayerId={overview.playerId} />
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
        <TeamFinanceTab
          isAdmin={isAdmin}
          balance={overview.balance}
          authMeStore={authMe}
          onChange={handleTabRefresh}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .page--team {
    max-width: 960px;
    padding-bottom: 25px;
  }

  .team-skeleton {
    padding: var(--space-lg);
  }

  .team-header {
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .team-header__hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .team-header__identity {
    flex: 1 1 12rem;
    min-width: 0;
  }

  .team-header__title {
    margin: 0;
    font-size: clamp(1.35rem, 3vw, 1.65rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .team-header__sub {
    margin: 0.35rem 0 0 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .team-header__sub-sep {
    margin: 0 0.35rem;
  }

  .team-header__treasury {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    padding: 0.65rem 1rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--glass-bg);
    min-width: min(11rem, 100%);
  }

  .team-header__treasury-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--muted);
  }

  .team-header__treasury-value {
    font-size: clamp(1.35rem, 3.5vw, 1.65rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--ok);
    line-height: 1.1;
  }

  .team-header__treasury-value--neg {
    color: var(--danger);
  }

  .team-header__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
    gap: var(--space-sm);
  }

  .team-metric {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.85rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.06));
  }

  .team-metric__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .team-metric__value {
    font-size: 1.2rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .team-metric__label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .team-metric--alert .team-metric__value {
    color: var(--gold);
  }

  .team-metric--link {
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }

  .team-metric--link:hover {
    border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
    background: color-mix(in srgb, var(--primary) 8%, var(--glass-bg-strong, rgba(0, 0, 0, 0.06)));
  }

  .team-metric--link:hover .team-metric__value,
  .team-metric--link:hover :global(.team-metric__icon) {
    color: var(--primary);
  }

  .team-metric--link.team-metric--alert:hover .team-metric__value {
    color: color-mix(in srgb, var(--gold) 85%, var(--primary));
  }

  .team-metric--link:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  :global(.team-metric__icon) {
    flex-shrink: 0;
    color: var(--muted);
    transition: color 0.15s ease;
  }

  .team-metric--link:hover :global(.team-metric__icon) {
    color: var(--primary);
  }

  .team-tabs-wrap {
    position: relative;
    margin: var(--space-lg) 0 var(--space-md) 0;
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
    transition: color 0.15s ease, background 0.15s ease;
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
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }

  .team-tabs::-webkit-scrollbar {
    display: none;
  }

  .team-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.65rem 1.1rem;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color var(--transition), border-color var(--transition);
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
  }

  .team-tab:hover .team-tab__icon {
    color: var(--fg);
  }

  .team-tab--active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .team-tab--active .team-tab__icon {
    color: var(--primary);
  }

  .team-panel[hidden] {
    display: none;
  }
</style>
