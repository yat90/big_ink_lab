<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { TeamOverview } from '$lib/components/team/team-analytics';
  import { fetchTeamMembers } from '$lib/components/team/team-members';
  import { formatDate, formatMoney } from '$lib/components/team/team-utils';
  import { TEAM_DRIVE_MEETINGS_URL } from '$lib/components/team/teamDriveLinks';
  import { dicebearAvatarUrl } from '$lib/dicebearFunEmojiAvatar';
  import { t } from '$lib/i18n';
  import teamLogo from '../../images/logo.png';
  import IconBarChart from '$lib/icons/IconBarChart.svelte';
  import IconCloud from '$lib/icons/IconCloud.svelte';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';

  interface Props {
    overview: TeamOverview;
    isAdmin: boolean;
  }
  let { overview, isAdmin }: Props = $props();

  type ActivityRow = { id: string; name: string; joinedAt: string | null };
  let activityRows = $state<ActivityRow[]>([]);
  let activityLoading = $state(true);

  const balance = $derived(overview.balance);

  onMount(async () => {
    try {
      const members = await fetchTeamMembers();
      const sorted = [...members].sort((a, b) => {
        const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return tb - ta;
      });
      activityRows = sorted.slice(0, 8).map((m) => ({
        id: m.playerId,
        name: m.name,
        joinedAt: m.joinedAt,
      }));
    } catch {
      activityRows = [];
    } finally {
      activityLoading = false;
    }
  });

  function goInvite() {
    void goto('/team?tab=members&invite=1');
  }
</script>

<div class="team-overview">
  <section class="card team-overview__hero">
    <div class="team-overview__hero-main">
      <img
        class="team-overview__team-mark"
        src={teamLogo}
        alt=""
        width="72"
        height="72"
        loading="eager"
        decoding="async"
      />
      <div class="team-overview__hero-text">
        <h1 class="team-overview__title">{overview.team}</h1>
        <p class="team-overview__sub muted">
          {#if isAdmin}
            {$t('team.header.youManage')}
          {:else}
            {$t('team.header.youAreMember')}
          {/if}
          {#if balance && balance.monthlyDues > 0}
            <span class="team-overview__sub-sep" aria-hidden="true">·</span>
            {formatMoney(balance.monthlyDues)}{$t('team.header.monthlyDues')}
          {/if}
        </p>
      </div>
    </div>
  </section>

  {#if balance}
    <div class="team-overview__stats" role="group" aria-label={$t('team.header.metricsGroupLabel')}>
      <a href="/team?tab=finance" class="team-overview__stat team-overview__stat--link">
        <IconBarChart size={22} className="team-overview__stat-icon" />
        <div class="team-overview__stat-text">
          <span
            class="team-overview__stat-value"
            class:team-overview__stat-value--neg={balance.balance < 0}
          >
            {formatMoney(balance.balance)}
          </span>
          <span class="team-overview__stat-label">{$t('team.overview.statTreasury')}</span>
        </div>
      </a>
      <a href="/team?tab=members" class="team-overview__stat team-overview__stat--link">
        <IconUsers size={22} className="team-overview__stat-icon" />
        <div class="team-overview__stat-text">
          <span class="team-overview__stat-value">{balance.memberCount}</span>
          <span class="team-overview__stat-label">{$t('team.overview.statMembers')}</span>
        </div>
      </a>
      {#if overview.openAccusationsCount != null}
        <a
          href="/team?tab=court"
          class="team-overview__stat team-overview__stat--link"
          class:team-overview__stat--alert={overview.openAccusationsCount > 0}
          aria-label={$t('team.header.openCourtRoomAria')}
        >
          <IconGavel size={22} className="team-overview__stat-icon" />
          <div class="team-overview__stat-text">
            <span class="team-overview__stat-value">{overview.openAccusationsCount}</span>
            <span class="team-overview__stat-label">{$t('team.overview.statOpenCourt')}</span>
          </div>
        </a>
      {/if}
    </div>
  {/if}

  <section class="team-overview__section team-overview__section--flush">
    <h2 class="team-overview__section-title team-overview__section-title--pad">
      {$t('team.overview.actionsTitle')}
    </h2>
    <div class="team-overview__actions">
      {#if isAdmin}
        <a href="/team?tab=finance" class="card team-overview__action team-overview__action--link">
          <span class="team-overview__action-icon" aria-hidden="true">
            <IconBarChart size={22} className="team-overview__action-svg" />
          </span>
          <span class="team-overview__action-title">{$t('team.overview.actionFinance')}</span>
          <span class="team-overview__action-hint muted"
            >{$t('team.overview.actionFinanceHint')}</span
          >
        </a>
      {/if}
      <a href="/team?tab=penalties" class="card team-overview__action team-overview__action--link">
        <span class="team-overview__action-icon" aria-hidden="true">
          <IconGavel size={22} className="team-overview__action-svg" />
        </span>
        <span class="team-overview__action-title">{$t('team.overview.actionPenalties')}</span>
        <span class="team-overview__action-hint muted"
          >{$t('team.overview.actionPenaltiesHint')}</span
        >
      </a>      <a href="/team?tab=court" class="card team-overview__action team-overview__action--link">
        <span class="team-overview__action-icon" aria-hidden="true">
          <IconGavel size={22} className="team-overview__action-svg" />
        </span>
        <span class="team-overview__action-title">{$t('team.overview.actionCourt')}</span>
        <span class="team-overview__action-hint muted"
          >{$t('team.overview.actionCourtHint')}</span
        >
      </a>
      <a href="/me" class="card team-overview__action team-overview__action--link">
        <span class="team-overview__action-icon" aria-hidden="true">
          <IconEdit size={22} className="team-overview__action-svg" />
        </span>
        <span class="team-overview__action-title">{$t('team.overview.actionSettings')}</span>
        <span class="team-overview__action-hint muted"
          >{$t('team.overview.actionSettingsHint')}</span
        >
      </a>
      <a
        href={TEAM_DRIVE_MEETINGS_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="card team-overview__action team-overview__action--link"
      >
        <span class="team-overview__action-icon" aria-hidden="true">
          <IconCloud size={22} className="team-overview__action-svg" />
        </span>
        <span class="team-overview__action-title">{$t('team.overview.actionMeetings')}</span>
        <span class="team-overview__action-hint muted"
          >{$t('team.overview.actionMeetingsHint')}</span
        >
      </a>
    </div>
  </section>

  <section class="card team-overview__section">
    <h2 class="team-overview__section-title">{$t('team.overview.activityTitle')}</h2>
    {#if activityLoading}
      <p class="muted team-overview__muted">{$t('team.overview.activityLoading')}</p>
    {:else if activityRows.length === 0}
      <p class="muted team-overview__muted">{$t('team.overview.activityEmpty')}</p>
    {:else}
      <ul class="team-overview__activity" role="list">
        {#each activityRows as row (row.id)}
          <li class="team-overview__activity-row">
            <img
              class="team-overview__activity-avatar"
              src={dicebearAvatarUrl(row.id, { size: 64 })}
              alt=""
              width="32"
              height="32"
              loading="lazy"
              decoding="async"
            />
            <div class="team-overview__activity-body">
              <span class="team-overview__activity-label">
                {$t('team.overview.activityJoined', { name: row.name })}
              </span>
              {#if row.joinedAt}
                <time class="muted team-overview__activity-date" datetime={row.joinedAt}>
                  {formatDate(row.joinedAt)}
                </time>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .team-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-bottom: var(--space-lg);
  }

  .team-overview__hero {
    padding: var(--space-md);
    border-left: 3px solid var(--primary);
  }

  @media (min-width: 640px) {
    .team-overview__hero {
      padding: var(--space-lg);
    }
  }

  .team-overview__hero-main {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    min-width: 0;
  }

  .team-overview__team-mark {
    flex-shrink: 0;
    width: 4.5rem;
    height: 4.5rem;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.35));
  }

  @media (min-width: 640px) {
    .team-overview__team-mark {
      width: 5.5rem;
      height: 5.5rem;
    }
  }

  .team-overview__hero-text {
    min-width: 0;
  }

  .team-overview__title {
    margin: 0;
    font-size: clamp(1.25rem, 3vw, 1.65rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .team-overview__sub {
    margin: 0.35rem 0 0 0;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .team-overview__sub-sep {
    margin: 0 0.3rem;
  }

  .team-overview__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
    gap: var(--space-sm);
  }

  .team-overview__stat {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: var(--space-md);
    border-radius: var(--radius);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(var(--glass-saturate)) blur(var(--glass-blur));
    box-shadow: var(--shadow-card);
  }

  .team-overview__stat--link {
    text-decoration: none;
    color: inherit;
    transition:
      border-color var(--transition),
      background var(--transition),
      box-shadow var(--transition);
  }

  .team-overview__stat--link:hover {
    border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
    background: var(--glass-bg-strong);
    box-shadow: var(--shadow);
  }

  .team-overview__stat--link:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .team-overview__stat--alert .team-overview__stat-value {
    color: var(--gold);
  }

  :global(.team-overview__stat-icon) {
    flex-shrink: 0;
    color: var(--muted);
  }

  .team-overview__stat--link:hover :global(.team-overview__stat-icon) {
    color: var(--primary);
  }

  .team-overview__stat-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .team-overview__stat-value {
    font-size: 1.15rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--ok);
    line-height: 1.1;
  }

  .team-overview__stat-value--neg {
    color: var(--danger);
  }

  .team-overview__stat-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
  }

  .team-overview__section {
    padding: var(--space-md);
  }

  @media (min-width: 640px) {
    .team-overview__section {
      padding: var(--space-lg);
    }
  }

  .team-overview__section--flush {
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .team-overview__section-title {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .team-overview__section-title--pad {
    padding: 0 var(--space-md);
  }

  @media (min-width: 640px) {
    .team-overview__section-title--pad {
      padding: 0 var(--space-lg);
    }
  }

  .team-overview__muted {
    margin: 0;
    font-size: 0.9rem;
  }

  .team-overview__activity {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .team-overview__activity-row {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .team-overview__activity-avatar {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 1px solid var(--border-ui);
  }

  .team-overview__activity-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .team-overview__activity-label {
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .team-overview__activity-date {
    font-size: 0.75rem;
  }

  .team-overview__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  @media (min-width: 640px) {
    .team-overview__actions {
      gap: var(--space-md);
    }
  }

  .team-overview__action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
    padding: var(--space-md);
    text-align: left;
    min-height: 5.5rem;
    text-decoration: none;
    color: inherit;
    transition:
      border-color var(--transition),
      background var(--transition),
      box-shadow var(--transition);
  }

  .team-overview__action--btn {
    width: 100%;
    cursor: pointer;
    font-family: inherit;
  }

  .team-overview__action--link:hover {
    border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
    background: var(--glass-bg-strong);
    box-shadow: var(--shadow);
  }

  .team-overview__action--link:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .team-overview__action-icon {
    display: flex;
    color: var(--primary);
  }

  :global(.team-overview__action-svg) {
    display: block;
  }

  .team-overview__action-title {
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .team-overview__action-hint {
    font-size: 0.75rem;
    line-height: 1.35;
    margin-top: auto;
  }
</style>
