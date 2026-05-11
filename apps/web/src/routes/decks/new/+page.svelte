<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { config } from '$lib/config';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthToken } from '$lib/auth';
  import PlayerPickerModal from '$lib/components/player/PlayerPickerModal.svelte';
  import { getLocale, translate, t } from '$lib/i18n';

  let deckName = $state('');
  let deckList = $state('');
  let notes = $state('');
  let playerId = $state('');
  let selectedPlayerLabel = $state('');
  let playerPickerOpen = $state(false);
  let loading = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';

  async function loadSuggestedName() {
    try {
      const token = getAuthToken();
      const res = await fetch(`${apiUrl}/decks/suggest-name`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = (await res.json()) as { name?: string };
      if (typeof data?.name === 'string' && data.name.trim()) {
        deckName = data.name.trim();
      }
    } catch {
      /* ignore */
    }
  }

  onMount(async () => {
    void loadSuggestedName();
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const me = await res.json();
        if (me?.player?._id) {
          playerId = me.player._id;
          const p = me.player as { name?: string; team?: string };
          selectedPlayerLabel = p.name ? `${p.name}${p.team ? ` · ${p.team}` : ''}` : '';
        }
      }
    } catch {
      /* ignore */
    }
  });

  function onPlayerSelect(id: string, player?: { name: string; team?: string }) {
    playerId = id;
    selectedPlayerLabel = player ? `${player.name}${player.team ? ` · ${player.team}` : ''}` : '';
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch(`${apiUrl}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deckName.trim() || undefined,
          deckList: deckList.trim(),
          notes: notes.trim() || undefined,
          player: playerId || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const m = data.message;
        if (Array.isArray(m)) {
          error = m.join(', ');
        } else if (typeof m === 'string' && m.trim()) {
          error = m.trim();
        } else {
          error = translate(getLocale(), 'common.errorWithStatus', { status: String(res.status) });
        }
        return;
      }
      const deck = await res.json();
      await goto(`/decks/${deck._id}`);
    } catch {
      error = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('decks.pageTitleNew')}</title>
</svelte:head>

<div class="page">
  <AppCard className="stack">
    <h2 class="card__title">{$t('decks.createTitle')}</h2>
    <p class="card__sub">
      {$t('decks.createIntro')}
    </p>

    <form onsubmit={onSubmit} class="stack margin-top-sm">
      <div class="label">
        <label for="deckName">{$t('decks.labelDeckName')}</label>
        <div class="row row--sm deck-new__name-row">
          <input
            id="deckName"
            name="deckName"
            type="text"
            class="input deck-new__name-input"
            bind:value={deckName}
            maxlength="200"
            placeholder={$t('decks.placeholderDeckName')}
            autocomplete="off"
          />
          <AppButton
            type="button"
            size="sm"
            className="deck-new__suggest-btn"
            onclick={() => loadSuggestedName()}
            disabled={loading}
          >
            {$t('decks.anotherName')}
          </AppButton>
        </div>
      </div>
      <label class="label" for="deckList">
        {$t('decks.labelDeckList')}
        <span class="hint">{$t('common.optionalInParens')}</span>
        <textarea
          id="deckList"
          class="input"
          bind:value={deckList}
          rows="8"
          placeholder={$t('decks.placeholderDeckList')}
          style="resize: vertical; font-family: ui-monospace, monospace;"
        ></textarea>
      </label>
      <div class="label">
        {$t('common.player')}
        <span class="hint">{$t('common.optionalInParens')}</span>
        <button
          type="button"
          class="input deck-new__player-btn"
          onclick={() => (playerPickerOpen = true)}
          aria-label={$t('common.choosePlayerAria')}
        >
          <span class="deck-new__player-label"
            >{selectedPlayerLabel.trim() ? selectedPlayerLabel : $t('common.noneDash')}</span
          >
        </button>
      </div>
      <PlayerPickerModal
        bind:open={playerPickerOpen}
        title={$t('common.selectPlayer')}
        forLabel={$t('decks.playerPickerFor')}
        onSelect={onPlayerSelect}
        onClose={() => (playerPickerOpen = false)}
      />
      <label class="label" for="notes">
        {$t('common.notes')}
        <span class="hint">{$t('common.optionalInParens')}</span>
        <textarea
          id="notes"
          class="input"
          bind:value={notes}
          rows="3"
          placeholder={$t('common.notesPlaceholder')}
          style="resize: vertical;"
        ></textarea>
      </label>

      {#if error}
        <AppBanner variant="danger" message={error} />
      {/if}

      <div class="row margin-top-sm gap-12">
        <AppButton type="submit" variant="primary" disabled={loading}>
          {loading ? $t('common.creating') : $t('decks.createSubmit')}
        </AppButton>
        <AppButton href="/decks">{$t('common.cancel')}</AppButton>
      </div>
    </form>
  </AppCard>
</div>

<style>
  .deck-new__name-row {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .deck-new__name-input {
    flex: 1 1 12rem;
    min-width: 0;
  }
  .deck-new__suggest-btn {
    flex-shrink: 0;
    align-self: center;
  }
  .deck-new__player-btn {
    text-align: left;
    cursor: pointer;
  }
  .deck-new__player-label {
    color: var(--fg);
  }
</style>
