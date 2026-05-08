<script lang="ts">
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import AppBanner from '$lib/AppBanner.svelte';
  import AppButton from '$lib/AppButton.svelte';
  import { config } from '$lib/config';
  import { translate, t, locale } from '$lib/i18n';

  const apiUrl = config.apiUrl ?? '/api';

  function todayDateInput(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  let name = $state('');
  let date = $state(todayDateInput());
  let location = $state('');
  let url = $state('');
  let meta = $state('');
  let loading = $state(false);
  let error = $state('');

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    if (!name.trim() || !date.trim()) {
      error = translate(get(locale), 'common.requiredNameDate');
      return;
    }
    loading = true;
    try {
      const dateIso = `${date.trim()}T12:00:00.000Z`;
      const res = await fetch(`${apiUrl}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          date: dateIso,
          location: location.trim() || undefined,
          url: url.trim() || undefined,
          meta: meta.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error =
          (data as { message?: string }).message ??
          translate(get(locale), 'tournaments.new.errCreateStatus', { status: String(res.status) });
        return;
      }
      const id = (data as { _id?: string })._id;
      if (id) await goto(`/tournaments/${id}`);
      else await goto('/tournaments');
    } catch {
      error = translate(get(locale), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('tournaments.new.pageTitle')}</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">{$t('tournaments.new.title')}</h1>
  <p class="page-sub">
    {$t('tournaments.new.introBefore')}<strong>{$t('tournaments.new.introStrong')}</strong>{$t(
      'tournaments.new.introMiddle'
    )}<a href="/tournaments">{$t('tournaments.new.introListLink')}</a>{$t(
      'tournaments.new.introAfter'
    )}
  </p>

  <form class="card stack tournament-new__form" onsubmit={onSubmit}>
    <label class="label" for="tn-name">{$t('common.name')}</label>
    <input id="tn-name" class="input" bind:value={name} autocomplete="off" required />

    <label class="label" for="tn-date">{$t('common.date')}</label>
    <input id="tn-date" type="date" class="input" bind:value={date} required />

    <label class="label" for="tn-loc">{$t('common.location')}</label>
    <input id="tn-loc" class="input" bind:value={location} placeholder={$t('common.optional')} />

    <label class="label" for="tn-url">{$t('common.url')}</label>
    <input id="tn-url" class="input" bind:value={url} placeholder={$t('common.urlPlaceholder')} />

    <label class="label" for="tn-meta">{$t('common.meta')}</label>
    <input
      id="tn-meta"
      class="input"
      bind:value={meta}
      placeholder={$t('common.metaPlaceholderShort')}
      maxlength="120"
    />

    {#if error}
      <AppBanner variant="danger" message={error} />
    {/if}

    <div class="row tournament-new__actions">
      <AppButton type="submit" variant="primary" disabled={loading}>
        {loading ? $t('common.saving') : $t('tournaments.new.createTournament')}
      </AppButton>
      <AppButton href="/tournaments">{$t('common.cancel')}</AppButton>
    </div>
  </form>
</div>

<style>
  .tournament-new__actions {
    margin-top: var(--space-sm, 0.5rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
