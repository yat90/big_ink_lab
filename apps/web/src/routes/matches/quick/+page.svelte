<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { getLocale, translate, t } from '$lib/i18n';

  const apiUrl = config.apiUrl ?? '/api';
  const QUICK_MATCH_P1_ID = '69a8a02d97f97400baf9f7fc';
  const QUICK_MATCH_P2_ID = '69a8a03297f97400baf9f7ff';

  let error = $state('');
  let loading = $state(true);

  onMount(async () => {
    try {
      let p1Id = QUICK_MATCH_P1_ID;
      const token = getAuthToken();
      if (token) {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.player?._id) p1Id = me.player._id;
        }
      }
      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'Casual',
          games: [{}],
          p1: p1Id,
          p2: QUICK_MATCH_P2_ID,
          playedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        error = translate(getLocale(), 'matches.quick.errCreate');
        loading = false;
        return;
      }
      const match = await res.json();
      goto(`/matches/${match._id}/lore`);
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{$t('matches.quick.pageTitle')}</title>
</svelte:head>

<div class="page">
  <AppCard className="stack">
    {#if loading && !error}
      <p class="muted">{$t('matches.quick.creating')}</p>
    {:else if error}
      <AppBanner variant="danger" message={error} />
      <AppButton href="/" variant="primary">{$t('matches.quick.backHome')}</AppButton>
    {/if}
  </AppCard>
</div>
