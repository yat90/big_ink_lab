<script lang="ts">
  import { goto } from '$app/navigation';
  import { config } from '$lib/config';
  import { getAuthToken } from '$lib/auth';
  import { authMe } from '$lib/me';
  import { STAGE_OPTIONS } from '$lib/matches';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import { onMount } from 'svelte';
  import { t, getLocale, translate } from '$lib/i18n';

  const apiUrl = config.apiUrl ?? '/api';

  type Player = { _id: string; name: string; team: string };

  type ScannedGame = { p1Lore: number; p2Lore: number; winner: 'p1' | 'p2' | null };

  // --- Image state ---
  let imageFile = $state<File | null>(null);
  let imagePreviewUrl = $state<string | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  // --- Scan state ---
  let scanning = $state(false);
  let scanError = $state('');
  let scanNotes = $state('');
  let scanDone = $state(false);
  let unavailable = $state(false);

  // --- Games state (editable after scan) ---
  let games = $state<ScannedGame[]>([]);

  // --- Match creation state ---
  let p1 = $state('');
  let myPlayerName = $state('');
  let p1Team = $state('');
  let p2 = $state('');
  let p2NameFilter = $state('');
  let p2Candidates = $state<Player[]>([]);
  let players = $state<Player[]>([]);
  let p2ListLoading = $state(false);
  let p2ListError = $state('');
  let p2ListGen = 0;
  let p2FilterFocused = $state(false);
  let p2BlurCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let stage = $state('Casual');
  let playedAt = $state(nowForDatetimeLocal());
  let createLoading = $state(false);
  let createError = $state('');
  let createGuestLoading = $state(false);
  let createGuestError = $state('');

  function nowForDatetimeLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const showP2CreateGuest = $derived(
    p2FilterFocused &&
      !p2ListLoading &&
      p2Candidates.length === 0 &&
      p2NameFilter.trim().length > 0,
  );

  function authHeaders(): Record<string, string> {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  onMount(() => {
    return authMe.subscribe((me) => {
      if (me?.player?._id) p1 = me.player._id;
      else p1 = '';
      p1Team = (me?.player?.team ?? '').trim();
      myPlayerName = (me?.player?.name ?? '').trim();
    });
  });

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    imageFile = file;
    scanDone = false;
    scanError = '';
    games = [];
    scanNotes = '';
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  async function handleScan() {
    if (!imageFile) {
      scanError = translate(getLocale(), 'matches.scan.errNoImage');
      return;
    }
    scanning = true;
    scanError = '';
    scanNotes = '';
    games = [];
    scanDone = false;
    unavailable = false;

    try {
      const form = new FormData();
      form.append('image', imageFile);
      const res = await fetch(`${apiUrl}/matches/scan-lore-counter`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) {
        let msg = translate(getLocale(), 'matches.scan.errScanFailed');
        try {
          const data = (await res.json()) as { message?: string };
          if (typeof data.message === 'string' && data.message.trim()) msg = data.message;
        } catch { /* ignore */ }
        scanError = msg;
        return;
      }
      const data = (await res.json()) as {
        available: boolean;
        games: ScannedGame[];
        notes?: string;
      };
      if (!data.available) {
        unavailable = true;
        return;
      }
      games = (data.games ?? []).map((g) => ({
        p1Lore: g.p1Lore ?? 0,
        p2Lore: g.p2Lore ?? 0,
        winner: g.winner ?? null,
      }));
      scanNotes = data.notes ?? '';
      scanDone = true;
    } catch {
      scanError = translate(getLocale(), 'matches.scan.errScanFailed');
    } finally {
      scanning = false;
    }
  }

  function addGame() {
    games = [...games, { p1Lore: 0, p2Lore: 0, winner: null }];
  }

  function removeGame(idx: number) {
    games = games.filter((_, i) => i !== idx);
  }

  function setWinner(idx: number, winner: 'p1' | 'p2' | null) {
    games = games.map((g, i) => (i === idx ? { ...g, winner } : g));
  }

  function updateLore(idx: number, field: 'p1Lore' | 'p2Lore', raw: string) {
    const val = Math.max(0, Math.min(30, parseInt(raw, 10) || 0));
    games = games.map((g, i) => (i === idx ? { ...g, [field]: val } : g));
  }

  // --- Player search ---
  function mergePlayers(rows: Player[]) {
    const byId: Record<string, Player> = {};
    for (const p of players) byId[p._id] = p;
    for (const r of rows) byId[r._id] = { _id: r._id, name: r.name, team: (r.team ?? '').trim() };
    players = Object.values(byId);
  }

  function onP2FilterFocus() {
    if (p2BlurCloseTimer) { clearTimeout(p2BlurCloseTimer); p2BlurCloseTimer = null; }
    p2FilterFocused = true;
  }

  function onP2FilterBlur() {
    p2BlurCloseTimer = setTimeout(() => { p2BlurCloseTimer = null; p2FilterFocused = false; }, 120);
  }

  function onP2SuggestionsMouseDown(e: MouseEvent) { e.preventDefault(); }

  function selectP2(pl: Player) {
    if (pl._id === p1) return;
    p2 = pl._id;
    p2NameFilter = pl.name;
    createGuestError = '';
    mergePlayers([pl]);
    if (p2BlurCloseTimer) { clearTimeout(p2BlurCloseTimer); p2BlurCloseTimer = null; }
    p2FilterFocused = false;
  }

  async function loadP2Candidates() {
    const gen = ++p2ListGen;
    p2ListLoading = true;
    p2ListError = '';
    createGuestError = '';
    try {
      const params = new URLSearchParams({ page: '1', limit: '3', includeGuests: 'true' });
      const q = p2NameFilter.trim();
      if (q) params.set('name', q);
      const res = await fetch(`${apiUrl}/players?${params}`, { headers: authHeaders() });
      if (!res.ok) {
        if (gen === p2ListGen) { p2Candidates = []; p2ListError = translate(getLocale(), 'matches.scan.errScanFailed'); }
        return;
      }
      const json = await res.json();
      if (gen !== p2ListGen) return;
      const rows: Player[] = (json?.data ?? []).map((r: Player) => ({
        _id: r._id, name: r.name, team: (r.team ?? '').trim(),
      }));
      const rowsNoSelf = rows.filter((r) => r._id !== p1);
      p2Candidates = rowsNoSelf;
      mergePlayers(rowsNoSelf);
    } catch {
      if (gen === p2ListGen) { p2Candidates = []; p2ListError = translate(getLocale(), 'common.apiUnreachable'); }
    } finally {
      if (gen === p2ListGen) p2ListLoading = false;
    }
  }

  async function createGuestOpponent() {
    const name = p2NameFilter.trim();
    if (!name) return;
    createGuestError = '';
    createGuestLoading = true;
    try {
      const res = await fetch(`${apiUrl}/players`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, team: '', isGuest: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        createGuestError = (typeof data.message === 'string' ? data.message : null) ?? translate(getLocale(), 'matches.scan.createGuestError');
        return;
      }
      const created = await res.json();
      const id = String(created._id ?? '');
      const createdName = String(created.name ?? name).trim();
      const team = String(created.team ?? '').trim();
      mergePlayers([{ _id: id, name: createdName, team }]);
      p2 = id;
      p2NameFilter = createdName;
      if (p2BlurCloseTimer) { clearTimeout(p2BlurCloseTimer); p2BlurCloseTimer = null; }
      p2FilterFocused = false;
      void loadP2Candidates();
    } catch {
      createGuestError = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      createGuestLoading = false;
    }
  }

  let p2ListDebounce: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    void p1; void p2NameFilter; void p2FilterFocused;
    if (!p2FilterFocused) {
      if (p2ListDebounce) { clearTimeout(p2ListDebounce); p2ListDebounce = null; }
      return;
    }
    if (p2ListDebounce) { clearTimeout(p2ListDebounce); p2ListDebounce = null; }
    p2ListDebounce = setTimeout(() => { p2ListDebounce = null; void loadP2Candidates(); }, 300);
    return () => { if (p2ListDebounce) clearTimeout(p2ListDebounce); };
  });

  const p2PlayerDisplayName = $derived(
    p2 ? (players.find((pl) => pl._id === p2)?.name ?? translate(getLocale(), 'matches.new.player2Default')) : translate(getLocale(), 'matches.new.player2Default'),
  );

  // --- Create match ---
  async function handleCreateMatch(e: Event) {
    e.preventDefault();
    createError = '';
    if (!p1?.trim()) { createError = translate(getLocale(), 'matches.scan.errNoLinkedPlayer'); return; }
    if (!p2?.trim()) { createError = translate(getLocale(), 'matches.scan.errNoOpponent'); return; }
    if (p2 === p1) { createError = translate(getLocale(), 'matches.scan.errOpponentSelf'); return; }

    createLoading = true;
    try {
      const matchGames = games.map((g) => ({
        p1Lore: g.p1Lore,
        p2Lore: g.p2Lore,
        winner: g.winner === 'p1' ? p1 : g.winner === 'p2' ? p2 : undefined,
        status: 'done',
      }));

      const body: Record<string, unknown> = {
        p1,
        p2,
        stage,
        playedAt: playedAt ? new Date(playedAt).toISOString() : new Date().toISOString(),
        games: matchGames,
      };

      if (matchGames.length > 0) {
        const p1Wins = matchGames.filter((g) => g.winner === p1).length;
        const p2Wins = matchGames.filter((g) => g.winner === p2).length;
        if (p1Wins !== p2Wins) {
          body.matchWinner = p1Wins > p2Wins ? p1 : p2;
        }
      }

      const res = await fetch(`${apiUrl}/matches`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        createError = (typeof data.message === 'string' && data.message.trim()) ? data.message : translate(getLocale(), 'matches.scan.errCreateFailed');
        return;
      }
      const match = await res.json();
      await goto(`/matches/${match._id}`);
    } catch {
      createError = translate(getLocale(), 'common.apiUnreachable');
    } finally {
      createLoading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('matches.scan.pageTitle')}</title>
</svelte:head>

<div class="page scan-page">
  <h2 class="page-title">
    {$t('matches.scan.title')}<span class="scan-beta-badge" aria-label="Beta">Beta</span>
  </h2>
  <p class="page-sub">{$t('matches.scan.subtitle')}</p>

  <!-- Image upload -->
  <section class="card stack scan-card" aria-labelledby="scan-upload-title">
    <h3 id="scan-upload-title" class="card__title">{$t('matches.scan.uploadLabel')}</h3>
    <p class="card__sub muted">{$t('matches.scan.uploadHint')}</p>
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      capture="environment"
      class="scan-file-input"
      aria-label={$t('matches.scan.uploadLabel')}
      onchange={handleFileChange}
      bind:this={fileInputEl}
    />
    {#if imagePreviewUrl}
      <img
        src={imagePreviewUrl}
        alt={$t('matches.scan.previewAlt')}
        class="scan-preview"
      />
    {/if}
    {#if unavailable}
      <AppBanner variant="warning" message={$t('matches.scan.unavailable')} />
    {/if}
    {#if scanError}
      <AppBanner variant="danger" message={scanError} />
    {/if}
    <AppButton
      type="button"
      variant="primary"
      disabled={scanning || !imageFile}
      aria-busy={scanning}
      onclick={handleScan}
    >
      {scanning ? $t('matches.scan.scanning') : $t('matches.scan.scanButton')}
    </AppButton>
  </section>

  <!-- Scan results -->
  {#if scanDone}
    <section class="card stack scan-card" aria-labelledby="scan-results-title">
      <h3 id="scan-results-title" class="card__title">{$t('matches.scan.resultsTitle')}</h3>

      <p class="scan-p1-note muted">
        {$t('matches.scan.resultsP1Note', { name: myPlayerName.trim() || $t('matches.new.you') })}
      </p>

      {#if scanNotes}
        <p class="scan-notes muted">
          <strong>{$t('matches.scan.notesLabel')}:</strong> {scanNotes}
        </p>
      {/if}

      {#if games.length === 0}
        <p class="card__sub muted" role="status">{$t('matches.scan.noGamesFound')}</p>
      {:else}
        <div class="scan-games" role="list">
          {#each games as game, idx (idx)}
            {@const p1Label = myPlayerName.trim() || $t('matches.new.you')}
            <div class="scan-game-row card stack" role="listitem">
              <div class="scan-game-header">
                <span class="scan-game-label">{$t('matches.scan.gameLabel', { n: idx + 1 })}</span>
                <button
                  type="button"
                  class="scan-remove-btn"
                  aria-label={$t('matches.scan.removeGame', { n: idx + 1 })}
                  onclick={() => removeGame(idx)}
                >✕</button>
              </div>
              <div class="scan-game-scores">
                <label class="label scan-score-label">
                  {$t('matches.scan.p1LoreLabel', { name: p1Label })}
                  <input
                    type="number"
                    min="0"
                    max="30"
                    class="input scan-score-input"
                    value={game.p1Lore}
                    oninput={(e) => updateLore(idx, 'p1Lore', (e.currentTarget as HTMLInputElement).value)}
                  />
                </label>
                <label class="label scan-score-label">
                  {$t('matches.scan.p2LoreLabel')}
                  <input
                    type="number"
                    min="0"
                    max="30"
                    class="input scan-score-input"
                    value={game.p2Lore}
                    oninput={(e) => updateLore(idx, 'p2Lore', (e.currentTarget as HTMLInputElement).value)}
                  />
                </label>
              </div>
              <fieldset class="scan-winner-group">
                <legend class="label">{$t('matches.scan.winnerLabel')}</legend>
                <div class="scan-winner-options">
                  {#each [['p1', $t('matches.scan.winnerP1', { name: p1Label })], ['p2', $t('matches.scan.winnerP2')], [null, $t('matches.scan.winnerNone')]] as [val, label]}
                    <label class="scan-winner-option">
                      <input
                        type="radio"
                        name={`winner-${idx}`}
                        checked={game.winner === val}
                        onchange={() => setWinner(idx, val as 'p1' | 'p2' | null)}
                      />
                      {label}
                    </label>
                  {/each}
                </div>
              </fieldset>
            </div>
          {/each}
        </div>
      {/if}

      <AppButton type="button" onclick={addGame}>
        {$t('matches.scan.addGame')}
      </AppButton>
    </section>

    <!-- Match creation -->
    {#if games.length > 0}
      <section class="card stack scan-card" aria-labelledby="scan-create-title">
        <h3 id="scan-create-title" class="card__title">{$t('matches.scan.createMatchTitle')}</h3>
        <p class="card__sub muted">{$t('matches.scan.createMatchSubtitle')}</p>

        <form onsubmit={handleCreateMatch} class="stack">
          <div class="formgrid">
            <label class="label" for="scan-stage">
              {$t('matches.scan.stageLabel')}
              <select id="scan-stage" class="input" bind:value={stage}>
                {#each STAGE_OPTIONS as s (s)}
                  <option value={s}>{s}</option>
                {/each}
              </select>
            </label>
            <label class="label" for="scan-playedAt">
              {$t('matches.scan.playedAtLabel')}
              <input id="scan-playedAt" type="datetime-local" class="input" bind:value={playedAt} />
            </label>
          </div>

          <!-- Player 1 -->
          <div class="label" id="scan-p1-label">{$t('matches.scan.p1Label')}</div>
          <div class="input scan-you-display" aria-labelledby="scan-p1-label">
            {myPlayerName.trim() || $t('matches.new.you')}
          </div>

          <!-- Player 2 -->
          <label class="label" for="scan-p2">{$t('matches.scan.p2Label')}</label>
          <div class="scan-p2-wrap">
            <input
              id="scan-p2"
              type="text"
              class="input"
              maxlength="120"
              bind:value={p2NameFilter}
              placeholder={$t('matches.scan.opponentFilterPlaceholder')}
              autocomplete="off"
              onfocus={onP2FilterFocus}
              onblur={onP2FilterBlur}
            />
            {#if p2FilterFocused}
              <div class="scan-p2-popover" onmousedown={onP2SuggestionsMouseDown}  aria-hidden="true">
                {#if p2ListError}
                  <AppBanner variant="danger" message={p2ListError} />
                {:else if p2ListLoading}
                  <p class="card__sub muted scan-p2-pad" role="status">{$t('matches.scan.p2ListLoading')}</p>
                {:else if p2Candidates.length === 0}
                  <p class="card__sub muted scan-p2-pad" role="status">
                    {p2NameFilter.trim() ? $t('matches.scan.p2ListEmpty') : $t('matches.scan.p2ListEmptyNoFilter')}
                  </p>
                {:else}
                  <ul class="scan-p2-list" aria-label={$t('matches.scan.p2Label')}>
                    {#each p2Candidates as pl (pl._id)}
                      <li>
                        <button type="button" class="scan-p2-row" class:scan-p2-row--selected={p2 === pl._id} onclick={() => selectP2(pl)}>
                          <span>{pl.name}</span>
                          {#if pl.team}<span class="muted"> ({pl.team})</span>{/if}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
                {#if showP2CreateGuest}
                  <div class="scan-guest-create scan-p2-pad">
                    <AppButton type="button" variant="primary" disabled={createGuestLoading || !p2NameFilter.trim()} aria-busy={createGuestLoading} onclick={createGuestOpponent}>
                      {createGuestLoading ? $t('matches.scan.createGuestCreating') : $t('matches.scan.createGuest')}
                    </AppButton>
                    <p class="card__sub muted">{$t('matches.scan.createGuestHelp', { name: p2NameFilter.trim() })}</p>
                    {#if createGuestError}
                      <AppBanner variant="danger" message={createGuestError} />
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          {#if p2}
            <p class="card__sub muted" role="status" aria-live="polite">
              {$t('matches.new.opponentSelected', { name: p2PlayerDisplayName })}
            </p>
          {/if}

          {#if createError}
            <AppBanner variant="danger" message={createError} />
          {/if}

          <div class="scan-actions row">
            <AppButton type="submit" variant="primary" disabled={createLoading} aria-busy={createLoading}>
              {createLoading ? $t('matches.scan.creating') : $t('matches.scan.createMatchButton')}
            </AppButton>
            <AppButton href="/matches">{$t('matches.scan.backToMatches')}</AppButton>
          </div>
        </form>
      </section>
    {/if}
  {/if}

  {#if !scanDone}
    <div class="scan-back">
      <AppButton href="/matches">{$t('matches.scan.backToMatches')}</AppButton>
    </div>
  {/if}
</div>

<style>
  .scan-page {
    max-width: 720px;
  }
  .scan-beta-badge {
    display: inline-block;
    margin-left: 0.45em;
    padding: 0.1em 0.5em;
    font-size: 0.55em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-radius: 4px;
    background: color-mix(in srgb, var(--primary, #2563eb) 18%, transparent);
    color: var(--primary, #2563eb);
    vertical-align: middle;
  }
  .scan-card {
    margin-bottom: var(--space-md, 1rem);
  }
  .scan-file-input {
    width: 100%;
    padding: 0.4rem 0;
  }
  .scan-preview {
    max-width: 100%;
    max-height: 320px;
    object-fit: contain;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--border);
    background: var(--bg2);
  }
  .scan-p1-note {
    font-size: 0.875em;
    margin: 0;
  }
  .scan-notes {
    font-size: 0.9em;
    margin: 0;
  }
  .scan-games {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .scan-game-row {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 6px);
  }
  .scan-game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .scan-game-label {
    font-weight: 600;
  }
  .scan-remove-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--fg-muted, #888);
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
  }
  .scan-remove-btn:hover {
    background: color-mix(in srgb, var(--danger, #dc2626) 12%, transparent);
    color: var(--danger, #dc2626);
  }
  .scan-game-scores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  .scan-score-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .scan-score-input {
    width: 100%;
  }
  .scan-winner-group {
    border: none;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  .scan-winner-group legend {
    margin-bottom: 0.35rem;
  }
  .scan-winner-options {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .scan-winner-option {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .scan-you-display {
    display: flex;
    align-items: center;
    min-height: 2.5rem;
    font-weight: 600;
    cursor: default;
  }
  .scan-p2-wrap {
    position: relative;
  }
  .scan-p2-popover {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    z-index: 30;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 6px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }
  .scan-p2-pad {
    padding: 0.5rem 0.65rem;
    margin: 0;
  }
  .scan-p2-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .scan-p2-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.65rem;
    border: none;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    color: var(--fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .scan-p2-list li:last-child .scan-p2-row {
    border-bottom: none;
  }
  .scan-p2-row:hover { background: var(--bg, rgba(0,0,0,0.04)); }
  .scan-p2-row--selected {
    background: color-mix(in srgb, var(--primary, #2563eb) 12%, transparent);
    font-weight: 600;
  }
  .scan-guest-create {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .scan-actions {
    margin-top: var(--space-md, 1rem);
    gap: 0.75rem;
  }
  .scan-back {
    margin-top: 0.5rem;
  }
</style>
