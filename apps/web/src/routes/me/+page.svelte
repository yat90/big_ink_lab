<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import StatusStateCard from '$lib/components/ui/StatusStateCard.svelte';
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import { getLocale, translate, t } from '$lib/i18n';

  type MeUser = { id: string; email: string; name?: string };
  type MePlayer = { _id: string; name: string; team: string };

  let user = $state<MeUser | null>(null);
  let player = $state<MePlayer | null>(null);
  let teamName = $state('');
  let playerName = $state('');
  let loading = $state(true);
  let savingTeam = $state(false);
  let savingPlayerName = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';
  const token = $derived(getAuthToken());

  async function loadMe() {
    if (!token) {
      error = translate(getLocale(), 'me.notLoggedIn');
      loading = false;
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        error = translate(getLocale(), 'me.loadError');
        loading = false;
        return;
      }
      const data = await res.json();
      user = data?.user ?? null;
      player = data?.player ?? null;
      teamName = player?.team ?? '';
      playerName = player?.name ?? '';
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }

  async function saveTeam() {
    if (!token) return;
    savingTeam = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ team: teamName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? translate(getLocale(), 'me.saveTeamError');
        return;
      }
      const data = await res.json();
      if (data?.player) {
        player = data.player;
        playerName = data.player.name;
      }
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      savingTeam = false;
    }
  }

  async function savePlayerName() {
    if (!token) return;
    savingPlayerName = true;
    error = '';
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? translate(getLocale(), 'me.savePlayerNameError');
        return;
      }
      const data = await res.json();
      if (data?.player) {
        player = data.player;
        teamName = data.player.team;
        playerName = data.player.name;
      }
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      savingPlayerName = false;
    }
  }

  onMount(loadMe);
</script>

<svelte:head>
  <title>{$t('me.pageTitle')}</title>
</svelte:head>

<div class="page">
  <AppCard className="stack">
    <h1 class="card__title">{$t('me.title')}</h1>

    {#if loading}
      <StatusStateCard kind="loading" message={$t('me.loading')} />
    {:else if error && !user}
      <AppBanner variant="danger" message={error} />
    {:else if user}
      <dl class="stack me-dl">
        <div class="dl-row">
          <dt class="muted">{$t('me.nameLabel')}</dt>
          <dd>{user.name || '–'}</dd>
        </div>
        <div class="dl-row">
          <dt class="muted">{$t('me.emailLabel')}</dt>
          <dd>{user.email}</dd>
        </div>
        {#if player}
          <div class="dl-row">
            <dt class="muted">{$t('me.playerNameLabel')}</dt>
            <dd>
              <div class="me-team-row">
                <input
                  type="text"
                  class="input"
                  bind:value={playerName}
                  placeholder={$t('me.playerNamePlaceholder')}
                  aria-label={$t('me.playerNameLabel')}
                  autocomplete="name"
                />
                <AppButton
                  type="button"
                  variant="primary"
                  disabled={savingPlayerName}
                  onclick={savePlayerName}
                >
                  {savingPlayerName ? $t('me.saving') : $t('me.save')}
                </AppButton>
              </div>
            </dd>
          </div>
          <div class="dl-row">
            <dt class="muted">{$t('me.teamLabel')}</dt>
            <dd>
              <div class="me-team-row">
                <input
                  type="text"
                  class="input"
                  bind:value={teamName}
                  placeholder={$t('me.teamPlaceholder')}
                  aria-label={$t('me.teamLabel')}
                />
                <AppButton
                  type="button"
                  variant="primary"
                  disabled={savingTeam}
                  onclick={saveTeam}
                >
                  {savingTeam ? $t('me.saving') : $t('me.save')}
                </AppButton>
              </div>
            </dd>
          </div>
        {/if}
      </dl>

      {#if error}
        <AppBanner variant="danger" message={error} />
      {/if}
    {/if}
  </AppCard>
  {#if player}
    <div class="me-stats-cta">
      <a href="/me/statistics" class="me-stats-cta__link">{$t('me.statsLinkLabel')}</a>
      <p class="me-stats-cta__hint muted">
        {$t('me.statsLinkHint')}
      </p>
    </div>
  {/if}
</div>

<style>
  .me-dl {
    margin: var(--space-md) 0;
  }
  .me-dl .dl-row {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  .me-dl dt {
    min-width: 5rem;
  }
  .me-team-row {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    flex-wrap: wrap;
  }
  .me-team-row .input {
    min-width: 12rem;
  }

  .me-stats-cta {
    margin-top: var(--space-lg);
    padding: var(--space-lg);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.04));
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .me-stats-cta__link {
    display: inline-block;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text);
    text-decoration: none;
    margin-bottom: var(--space-xs);
  }

  .me-stats-cta__link:hover {
    text-decoration: underline;
  }

  .me-stats-cta__hint {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style>
