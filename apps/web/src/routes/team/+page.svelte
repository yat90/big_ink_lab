<script lang="ts">
  import { onMount } from 'svelte';
  import { authMe } from '$lib/me';
  import { fetchTeamOverview, formatMoney, type TeamOverview } from '$lib/team';
  import TeamMembersTab from './TeamMembersTab.svelte';
  import TeamRankingTab from './TeamRankingTab.svelte';
  import TeamFinanceTab from './TeamFinanceTab.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import { registerPageRefresh } from '$lib/pageRefreshRegistry';

  type TabId = 'members' | 'ranking' | 'finance';
  const TABS: { id: TabId; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'ranking', label: 'Ranking' },
    { id: 'finance', label: 'Finance' },
  ];

  let overview = $state<TeamOverview | null>(null);
  let loading = $state(true);
  let error = $state('');
  let activeTab = $state<TabId>('members');

  const isAdmin = $derived(overview?.role === 'admin');

  async function loadOverview() {
    loading = true;
    error = '';
    try {
      overview = await fetchTeamOverview();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not load team.';
    } finally {
      loading = false;
    }
  }

  function handleTabRefresh() {
    void loadOverview();
  }

  onMount(() => {
    void loadOverview();
    return registerPageRefresh(loadOverview);
  });
</script>

<svelte:head>
  <title>Team · Big Ink Lab</title>
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
      <button type="button" class="btn" onclick={() => void loadOverview()}>Retry</button>
    </div>
  {:else if overview && !overview.hasTeam}
    <div class="card stack">
      <h1 class="card__title">No team yet</h1>
      <p class="card__sub">
        You aren't part of a team. Set your team name on the
        <a href="/me">Me</a> page to start managing members, finances and tasks.
      </p>
    </div>
  {:else if overview}
    <div class="team-header card">
      <div class="team-header__title-row">
        <div>
          <h1 class="team-header__title">{overview.team}</h1>
          <p class="team-header__sub muted">
            {#if isAdmin}
              You manage this team
            {:else}
              You're a member of this team
            {/if}
            · {overview.balance?.memberCount ?? 0} member{(overview.balance?.memberCount ?? 0) === 1 ? '' : 's'}
            {#if overview.balance && overview.balance.monthlyDues > 0}
              · {formatMoney(overview.balance.monthlyDues)}/month dues
            {/if}
          </p>
        </div>
        {#if overview.balance}
          <div class="team-header__balance" aria-live="polite">
            <span class="team-header__balance-label muted">Treasury</span>
            <span
              class="team-header__balance-value"
              class:team-header__balance-value--neg={overview.balance.balance < 0}
            >
              {formatMoney(overview.balance.balance)}
            </span>
          </div>
        {/if}
      </div>
      <div class="team-header__stats">
        <div class="team-stat">
          <IconUsers size={20} className="team-stat__icon" />
          <div>
            <div class="team-stat__value">{overview.balance?.memberCount ?? 0}</div>
            <div class="team-stat__label muted">Members</div>
          </div>
        </div>
        {#if overview.balance && overview.balance.outstandingTotal > 0}
          <div class="team-stat team-stat--warn">
            <div>
              <div class="team-stat__value">{formatMoney(overview.balance.outstandingTotal)}</div>
              <div class="team-stat__label muted">Outstanding dues</div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="team-tabs" role="tablist" aria-label="Team sections">
      {#each TABS as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="team-panel-{tab.id}"
          id="team-tab-{tab.id}"
          class="team-tab"
          class:team-tab--active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
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
  }

  .team-skeleton {
    padding: var(--space-lg);
  }

  .team-header {
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .team-header__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .team-header__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .team-header__sub {
    margin: var(--space-xs) 0 0 0;
    font-size: 0.95rem;
  }

  .team-header__balance {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
  }

  .team-header__balance-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .team-header__balance-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--ok);
  }

  .team-header__balance-value--neg {
    color: var(--danger);
  }

  .team-header__stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-lg);
    margin-top: var(--space-lg);
  }

  .team-stat {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .team-stat__value {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .team-stat__label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .team-stat--warn .team-stat__value {
    color: var(--gold);
  }

  .team-tabs {
    display: flex;
    gap: 0;
    margin: var(--space-lg) 0 var(--space-md) 0;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .team-tabs::-webkit-scrollbar {
    display: none;
  }

  .team-tab {
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

  .team-tab:hover {
    color: var(--fg);
  }

  .team-tab--active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .team-panel[hidden] {
    display: none;
  }

  :global(.team-stat__icon) {
    color: var(--muted);
  }
</style>
