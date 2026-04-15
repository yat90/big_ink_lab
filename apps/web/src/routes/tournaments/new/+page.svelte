<script lang="ts">
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';

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
      error = 'Name and date are required.';
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
        error = (data as { message?: string }).message ?? `Could not create (${res.status})`;
        return;
      }
      const id = (data as { _id?: string })._id;
      if (id) await goto(`/tournaments/${id}`);
      else await goto('/tournaments');
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>New tournament · Big Ink Lab</title>
</svelte:head>

<div class="page tournament-new-page">
  <nav class="tournament-new__crumb muted" aria-label="Breadcrumb">
    <a href="/tournaments">Tournaments</a>
    <span aria-hidden="true"> / </span>
    <span>New</span>
  </nav>

  <h1 class="page-title">New tournament</h1>
  <p class="page-sub">
    Create an event record only. Add matches later from a tournament’s
    <strong>Add results</strong> link on <a href="/tournaments">the tournaments list</a> (or link
    them when logging matches).
  </p>

  <form class="card stack tournament-new__form" onsubmit={onSubmit}>
    <label class="label" for="tn-name">Name</label>
    <input id="tn-name" class="input" bind:value={name} autocomplete="off" required />

    <label class="label" for="tn-date">Date</label>
    <input id="tn-date" type="date" class="input" bind:value={date} required />

    <label class="label" for="tn-loc">Location</label>
    <input id="tn-loc" class="input" bind:value={location} placeholder="Optional" />

    <label class="label" for="tn-url">URL</label>
    <input id="tn-url" class="input" bind:value={url} placeholder="PlayHub Link, Melee Link,..." />

    <label class="label" for="tn-meta">Meta</label>
    <input
      id="tn-meta"
      class="input"
      bind:value={meta}
      placeholder="Optional (e.g. Set 11, Set 12, Infinity)"
      maxlength="120"
    />

    {#if error}
      <p class="alert" role="alert">{error}</p>
    {/if}

    <div class="row tournament-new__actions">
      <button type="submit" class="btn btn--primary" disabled={loading}>
        {loading ? 'Saving…' : 'Create tournament'}
      </button>
      <a href="/tournaments" class="btn">Cancel</a>
    </div>
  </form>
</div>

<style>
  .tournament-new-page {
    max-width: 520px;
  }
  .tournament-new__crumb {
    margin: 0 0 var(--space-sm, 0.5rem) 0;
    font-size: 0.875rem;
  }
  .tournament-new__crumb a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .page-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .page-sub {
    margin: 0 0 1.25rem 0;
    color: var(--muted);
    font-size: 0.9375rem;
    line-height: 1.45;
  }
  .page-sub a {
    color: inherit;
  }
  .tournament-new__actions {
    margin-top: var(--space-sm, 0.5rem);
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
